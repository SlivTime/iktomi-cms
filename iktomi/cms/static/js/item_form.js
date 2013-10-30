(function(){
  function ItemForm(frm){
    console.log('Generating ItemForm #'+frm.id);

    this.frm = frm;
    this._callback_hook = undefined;
    frm.store('ItemForm', this);
    frm.store('savedData', this.formHash());
    this.container = frm.getParent('.popup-body') || $('app-content');
    this.is_popup = !!frm.getParent('.popup-body');
    this.popup = frm.getParent('.popup');
    this.statusElement = this.frm.getElement('.autosave-status') || new Element('div');

    this.bindEventHandlers();
    this.addEvents();
    this.attachHooks();
    window.scrollTo(window.scrollX, window.scrollY+1);
  }

  ItemForm.prototype.attachHooks = function(){
    var hooks = new PreSaveHooks(this.frm);
    hooks.addEvent('ready', function(){
      this.do_submit.delay(0);
    }.bind(this));
    this.frm.store('hooks', hooks);

    if (this.frm.dataset.presavehooks){
      var hooks_list = this.frm.dataset.presavehooks.split(' ');
      for (var i=0; i<hooks_list.length; i++){
        hooks.append(window[hooks_list[i]]);
      }
    }

    if (this.frm.dataset.autosave){
      this.autoSaveInterval = window.setInterval(this.autoSaveHandler, 5000);
    }
  }

  ItemForm.prototype.bindEventHandlers = function(){
    this.redirectHandler = this.redirectHandler.bind(this);
    this.postHandler = this.postHandler.bind(this);
    this.saveHandler = this.saveHandler.bind(this);
    this.autoSaveHandler = this.autoSaveHandler.bind(this);
    this.saveAndContinueHandler = this.saveAndContinueHandler.bind(this);
    this.changeHandler = this.changeHandler.bind(this);
  }

  ItemForm.prototype.addEvents = function(){
    this.frm.getElements('.buttons a[rel="after-post"]').addEvent('click', this.redirectHandler);
    this.frm.getElements('.buttons a[rel="save-and-add"]').addEvent('click', this.redirectHandler);
    this.frm.getElements('.buttons a[rel="post"]').addEvent('click', this.postHandler);
    this.frm.getElements('.buttons a[rel="save"]').addEvent('click', this.saveHandler);
    this.frm.getElements('.buttons a[rel="save-and-continue"]').addEvent('click', this.saveAndContinueHandler);
    this.frm.getElements('.buttons a[rel="save-and-add"]').addEvent('click', this.redirectHandler);
    this.frm.addEvent('change', this.changeHandler);
    //this.frm.addEvent('keydown', this.changeHandler);
  }

  ItemForm.prototype.load = function(url){
    loadPage(url, true, this.container);
  }

  ItemForm.prototype.changeHandler = function(e){
    var newData = this.formHash(); // XXX works only on blur, have to check form hash each time
    if(this.frm.retrieve('savedData') != newData){
      this.statusElement.setAttribute('data-status', 'changed');
    }
  }

  ItemForm.prototype.redirectHandler = function(e){
      e.preventDefault(); e.stopPropagation();
      this.submit(e.target, function(result, button){
        this.load(button.getProperty('href'));
      }.bind(this));
  }

  ItemForm.prototype.postHandler = function(e){
    e.preventDefault(); e.stopPropagation();

    var button = e.target;
    var url = button.getAttribute('href');
    var doSubmit = function(){
      this.submit(button, function(result){
        renderPage(result, this.container);
      }, url);
    }.bind(this);

    if (!button.dataset.itemForm){
      this.withChangesHook(doSubmit);
    } else {
      doSubmit();
    }
  }

  ItemForm.prototype.saveHandler = function(e){
    e.preventDefault(); e.stopPropagation();
    this.submit(e.target, function(result, button){
      if(this.is_popup){
        this.popup.retrieve('popup').empty().hide();
      } else {
        this.load(button.getProperty('href'));
      }
    }.bind(this));
  }

  ItemForm.prototype.autoSaveHandler = function(){
    if (! this.frm.getParent('body') ) {
      console.log('AUTOSAVE stop')
      window.clearInterval(this.autoSaveInterval);
      return;
    }

    var newData = this.formHash();
    if(this.frm.retrieve('savedData') == newData){
      console.log('AUTOSAVE no changes');
      return;
    }

    this.statusElement.setAttribute('data-status', 'saving');

    var url = this.frm.dataset.autosave;
    new Request.JSON({
      url: url + (url.indexOf('?') == -1? '?': '&') + '__ajax',
      onSuccess: function(result){
        $$('.autosave-errors').removeClass('autosave-errors');
        if (result.success || result.error == 'draft'){
          this.frm.store('savedData', newData);
        }
        if (result.success){
          this.statusElement.setAttribute('data-status', 'saved');
          this.frm.setAttribute('action', result.item_url);
          this.frm.dataset.autosave = result.autosave_url;
          if(!this.is_popup){
            history.replaceState(null, null, result.item_url);
          }
          this.frm.getElements('.error').destroy();
          if (result.edit_session){
            this.frm.getElement('.item-lock').retrieve('item-lock').handleForceLock(result);
          }
        } else if (result.error == 'draft') {
          this.statusElement.setAttribute('data-status', 'draft');
          var errors = result.errors;

          for (var key in errors) if (errors.hasOwnProperty(key)){
            var field = $(this.frm.id + '-' + key);
            if (field){
              field.getParent('.form-row').addClass('autosave-errors');
            }
          }
          this.frm.getElements('.error').each(function(el){
            if (! el.getParent('.form-row').hasClass('autosave-errors')){
              el.destroy();
            }
          });
        }
      }.bind(this),
      onFailure: function(){
        this.statusElement.setAttribute('data-status', 'error');
      }.bind(this)
    }).post(this.frm); 
  }

  ItemForm.prototype.saveAndContinueHandler = function(e) {
    e.preventDefault(); e.stopPropagation();
    this.submit(e.target, function(result){
      this.load(result.item_url, true, this.container);
    }.bind(this));
  }

  ItemForm.prototype.withChangesHook = function(callback){
    if(this.hasChanges()){
      this.showConfirmationPopup(callback);
    } else {
      callback();
    }
  }

  ItemForm.prototype.showConfirmationPopup = function(doSubmit){
    if (this.confirmationPopup){
      var popup = this.confirmationPopup.empty();
    } else {
      var popup = new Popup(_popup_id(), {'close_button_on':false, 'clickable_overlay':false});
      this.confirmationPopup = popup;
    }
    var buttons_pane = new Element('div', {'class':'buttons'}).adopt(
      new Element('button', {'type': 'button', 'class': 'button', 'text': 'Продолжить'}).addEvent('click', function(){ popup.hide(); doSubmit(); }),
      new Element('button', {'type': 'button', 'class': 'button', 'text': 'Отменить'}).addEvent('click', function(){ popup.hide(); })
    );

    popup.setTitle('Объект был отредактирован со времени последнего сохранения. Это действие приведёт к потере всех изменений.');
    popup.adopt(buttons_pane);
    popup.show();
  }

  ItemForm.prototype.hasChanges = function(){
    var newData = this.formHash();
    return this.frm.retrieve('savedData') != newData;
    //var wysihtml5s = this.frm.getElements('[data-block-name="wysihtml5"]');
    //// XXX provide an interface for widgets that can track their changes
    //// themselves
    //for (var i=wysihtml5s.length; i--;){
    //  var widget = wysihtml5s[i].retrieve('widget');
    //  widget.composer.undoManager.transact();
    //  if (widget.composer.undoManager.undoPossible()) {
    //    return true;
    //  }
    //}
    return false;
  }

  ItemForm.prototype.submit = function(button, callback, url) {
    url = url || this.frm.getAttribute('action');
    this.do_submit = function(){
      new Request.JSON({
        url: url + (url.indexOf('?') == -1? '?': '&') + '__ajax' +(this.is_popup?'&__popup=':''),
        onSuccess: function(result){
          if (result.success){
            if (this._callback_hook) {
              this._callback_hook(result, function(){
                callback.call(this, result, button);
              });
            } else {
              callback.call(this, result, button);
            }
          } else {
            console.log('form load to', this.container)
            renderPage(result, this.container);
          }
        }.bind(this)
      }).post(this.frm); // XXX Post to IFRAME!
    }.bind(this);

    var hooks = this.frm.retrieve('hooks');
    hooks.apply(button);
  }

  ItemForm.prototype.stopAutosave = function(){
    console.log('AUTOSAVE off')
    window.clearInterval(this.autoSaveInterval);
    this.statusElement.dataset.autosaveOff = 'true';
  }

  ItemForm.prototype.formHash = function(){
    /*
     * pseudo-qs formatting for form content
     */
    // XXX hash?
    var queryString = [];
    this.frm.getElements('input, select, textarea').each(function(el){
      var type = el.type;
      if (!el.name || el.name.charAt('0') == '_' || el.name == 'edit_session' || el.disabled || 
          type == 'submit' || type == 'reset' || type == 'file' || type == 'image' 
          ) return;
          // XXX provide an interface for widgets that can track their changes
          // themselves

      if (el.dataset.blockName == 'wysihtml5'){
        var widget = el.retrieve('widget');
        if (widget) {
          widget.composer.undoManager.transact();
          var value = ''+widget.composer.undoManager.version;
        } else {
          var value = '1';
        }
      } else {
        var value = (el.get('tag') == 'select') ? el.getSelected().map(function(opt){
          // IE
          return document.id(opt).get('value');
        }) : ((type == 'radio' || type == 'checkbox') && !el.checked) ? null : el.get('value');
      }

      Array.from(value).each(function(val){
        if (typeof val != 'undefined') queryString.push(el.name + '=' + val.trim());
      });
    });
    return queryString.sort().join('&');
  }

  Blocks.register('item-form', function(el){
    new ItemForm(el);
  });

  Blocks.register('compact-buttons', function(el){
    var clsRe = /(?:^|\s)icon-(^\s)+/;
    var buttons = el.getElements('buttons').map(function(el){
      var match = el.className.match(clsRe);
      return cls_re && clsRe[1];
    }).filter(function(a){return a});

    if (el.dataset.compactName) {
      buttons.push(el.dataset.compactName);
    }

    var isCompact = buttons.filter(function(cls){
      return window.localStorage['compact:'+cls];
    }).length;
    if(isCompact){
      el.addClass('compact');
    }
    el.getElement('.compact-toggle').addEvent('click', function(){
      isCompact = !isCompact;
      if (isCompact){
        el.addClass('compact');
        buttons.each(function(cls){
          window.localStorage['compact:'+cls]="1";
        });
      } else {
        el.removeClass('compact');
        buttons.each(function(cls){
          delete window.localStorage['compact:'+cls];
        });
      }
    });
  });
})();
