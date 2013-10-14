# -*- coding: utf-8 -*-
from sqlalchemy import Column, Integer, DateTime, Boolean
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import object_session
from sqlalchemy.orm.util import identity_key

from iktomi.unstable.db.sqla.replication import replicate, replicate_attributes
from iktomi.utils import cached_property, cached_class_property
from iktomi.cms.item_lock import ItemLock

from datetime import datetime


class _WithState(object):

    ABSENT = 0
    PRIVATE = 1
    PUBLIC = 2
    DELETED = 3


    @declared_attr
    def created_dt(self):
        return Column(DateTime, nullable=False, default=datetime.now)

    @declared_attr
    def updated_dt(self):
        return Column(DateTime, nullable=False, default=datetime.now,
                      onupdate=datetime.now)

    @hybrid_property
    def public(self):
        return self.state==self.PUBLIC


class WithState(_WithState):

    @declared_attr
    def state(self):
        return Column(Integer, nullable=True, default=self.ABSENT)


class _AdminWithStateMixIn(object):

    def publish(self):
        self.state = self.PUBLIC
        _AdminReplicated.publish(self)

    def unpublish(self):
        '''Make the object invisible on front site.'''
        self._front_item.state = self.state = self.PRIVATE

    def delete(self):
        '''Mark the object as deleted (make it invisible on front and move to
        trash on admin site).'''
        self._front_item.state = self.state = self.DELETED


class _AdminWithState(_AdminWithStateMixIn, _WithState):
    pass


class AdminWithState(_AdminWithStateMixIn, WithState):

    pass


def _get_model_name(item):
    modelname = item.__class__.__name__
    # XXX item.models is not an interface
    for lang in item.models.langs:
        if modelname.endswith(lang.title()):
            return modelname[:-len(lang)]


class WithLanguage(object):

    def _item_version(self, version, lang):
        # XXX hacky
        models = getattr(AdminReplicated, version)
        models = getattr(models, lang)
        modelname = _get_model_name(self)
        model = getattr(models, modelname)
        db = object_session(self)
        ident = identity_key(instance=self)[1]
        assert ident is not None
        return db.query(model).get(ident)


class AdminWithLanguage(WithLanguage):

    def _create_versions(self):
        # be careful! makes flush!
        db = object_session(self)
        modelname = _get_model_name(self)

        # The first language is default. It is used as id autoincrement
        if self.models.lang != self.models.main_lang and self.id is None:
            # XXX self.models is not an interface!
            ru = getattr(self.models,
                         modelname + self.models.main_lang.title())()
            # Flush ru model first to get autoincrement id.
            # Do not flush english model yet, but return it to pending
            # state after the flush
            db.add(ru)
            db.expunge(self)
            db.flush()
            self.id = ru.id
            db.add(self)
            db.flush() # XXX is this needed?
        elif self.id is None:
            db.flush()

        for lang in self.models.langs:
            # create all en/ru admin/front versions
            if lang == self.models.lang:
                item = self
            else:
                model = getattr(self.models, modelname + lang.title())
                item = db.query(model).get(self.id)
                if item is None:
                    item = model(id=self.id)
                    db.add(item)

            if not item._front_item:
                # XXX it is better to do this automatically on before_insert or
                #     after_insert
                item._create_front_object()
            # flush changes for each language separately
            # to force queries in right order aloso on the front
            db.flush()

        if self.state is None or self.state == item.ABSENT:
            self.state = self.PRIVATE


# ==============   Repicated models


class _FrontReplicated(object):


    @cached_class_property
    def _admin_model(cls):
        # XXX
        return getattr(AdminReplicated.admin, cls.__name__)

    @cached_property
    def _admin_item(self):
        db = object_session(self)
        assert db is not None
        ident = identity_key(instance=self)[1]
        assert ident is not None
        return db.query(self._admin_model).get(ident)

    @cached_property
    def _other_version(self):
        return self._admin_item

    def item_global_id(self):
        return ItemLock.item_global_id(self._admin_item)


class FrontReplicated(_FrontReplicated):

    @cached_property
    def has_unpublished_changes(self):
        return self._admin_item.has_unpublished_changes


class _AdminReplicated(object):
    '''Model that is replicated (published) to front. You always have two
    versions: current and published.
    Don't use it for secondary table models, models of in-place editable relations
    and other models that are not replicated directly
    (use base model without mixins instead).'''

    @cached_class_property
    def front(cls):
        # XXX
        from models import front
        return front

    @cached_class_property
    def admin(cls):
        # XXX cycled imports
        from models import admin
        return admin

    @cached_class_property
    def _front_model(cls):
        return getattr(AdminReplicated.front, cls.__name__)

    @cached_property
    def _front_item(self):
        db = object_session(self)
        assert db is not None
        ident = identity_key(instance=self)[1]
        assert ident is not None
        return db.query(self._front_model).get(ident)

    @cached_property
    def _other_version(self):
        return self._front_item

    def _create_versions(self):
        # be careful! makes flush!
        if not self._front_item:
            object_session(self).flush()
            # XXX it is better to do this automatically on before_insert or
            #     after_insert
            self._create_front_object()
        # the item is created, we set PRIVATE state as default
        # XXX hasattr looks hacky
        if hasattr(self, 'state') and (
                self.state is None or self.state == self.ABSENT):
            self.state = self.PRIVATE

    def _create_front_object(self):
        replicate(self, self._front_model)

    def _copy_to_front(self):
        replicate(self, self._front_model)

    def _copy_from_front(self):
        replicate_attributes(self._front_item, self)

    def publish(self):
        '''Publish current version: copy to front and change auxiliary fields
        appropriately.'''
        self.has_unpublished_changes = False
        self._copy_to_front()

    def revert_to_published(self):
        '''Revert to published version (undo all changes after the object was
        last published).'''
        self._copy_from_front()
        self.has_unpublished_changes = False


class AdminReplicated(_AdminReplicated):

    @declared_attr
    def has_unpublished_changes(self):
        '''Was the object updated after publishing? Does it differ from
        published version?'''
        return Column(Boolean, nullable=False, default=True)#, onupdate=True)

