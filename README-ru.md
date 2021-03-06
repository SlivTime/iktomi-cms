# iktomi CMS


## Возможности

* Настраиваемая главная страница и верхнее меню.
* Работает как веб-приложение без перезагрузок страницы, с подгрузкой данных через AJAX.

### Потоки

* Потоки - список однотипных объектов, представленных схожим образом,
  для которых доступны схожая форма редактирования и схожие действия.
* Страница списка элементов.
    * Настраиваемый список свойств объектов для отображения.
    * Возможность отсортировать объекты по значению полей.
    * Постраничное представление.
* Фильтрация отображаемый на странице списка объектов посредством FilterForm.
    * Фильтрация объектов по значению полей.
    * Для конструирования формы можно использовать те же поля и виджеты, что и для формы редактирования.
    * Возможность программировать собственные условия фильтрации на уровне полей.
* Подключаемые и расширяемые компоненты потока - действия над объектами: редактирование, удаление,
  предпросмотр, история правок, публикация и т.д.
* Подключаемые действия для всего потока: ручное упорядочивание, групповое редактирование и т.д.
* Возможность задать постоянный фильтр для потока.
* Возможность включения ручной сортировки объектов в потоке с сохранением в базу данных.
* Расширяемая система разграничения доступа, прав создания, редактирования, удаления и публикации объектов.
* Поддержка Loners: потоков для всего одного экземпляра объекта без страницы списка.

### Редактирование

* Форма редактирования объекта в потоке.
* Возможность включения автосохранения через определенные периоды времени и при покидании страницы.
* Черновики форм. Если форма не проходит валидацию, она сохраняется как черновик.
  В следующий раз при заходе на страницу редактирования пользователь получает форму
  в точно таком же (невалидном) состоянии, в котором он её оставил, с отображаемыми сообщениями об ошибках.
  При этом невалидны объекты в основную базу данных не сохраняются.
* Блокировки объектов.
    * Объекты блокируются редакторами автоматически для действий, отмеченных как требующие блокировки.
    * Пользователи, не обладающие блокировкой, не могут производить действия над объектом,
      у блокировки может быть только один обладатель в каждый момент времени.
    * Блокировки реализованы на уровне вкладок браузера, так что пользователь не может
      войти в конфликт с самим собой, даже если он открыл одну страницу в разных вкладках.
    * Отображение обладателя блокировки при попытке получить доступ к объекту.
    * Возможность принудительного перехвата блокировки.
    * Обозначение заблокированных объектов на странице списка в потоке.
* Страница подтверждения удаления объекта со списком всех ссылающихся на него объектов
  (если связь реализована через sqlalchemy, а объекты имеют свой поток и доступны для пользователя).

### Формы

* Отображение, валидация и редактирование объектов с помощью
  [форм iktomi](http://iktomi.readthedocs.org/en/latest/forms-basic.html).
* Расширяемый редактор WYSIWYG. Основе wysihtml5 и наследует его систему плагинов.
  По-умолчанию, поддерживает стандартное форматирование и чистку HTML, отмену и повтор действий,
  редактирование исходного кода HTML.
* Гибкий конвертен для очистки HTML, реализованный на основе
  [lxml.html.clean](http://lxml.de/api/lxml.html.clean-module.html),
  с настраиваемым списком разрешенных имен тегов, атрибутов, классов, схем URL и др.
  Также полностью расширяем и позволяет писать произвольный код очистки и преобразования HTML.
* Показ и скрытие кнопок WYSIWYG автоматически на основе списка разрешенных тегов,
  когда это возможно.
* Виджеты для выбора объектов из других потоков, с полным сохранением возможности фильтрации и сортировки потока.
* Редактирование вложенных объектов и коллекций на странице родительского объекта (свойство sqlalchemy
  delete-orphan). Неограниченная глубина вложенности коллекций.
* Загрузка файлов через Ajax. Файлы в формах загружаются без перезагрузки и блокировки
  редактирования остального содержимого.
* Автоматическая генерация уменьшенных и обрезанных вариантов изображения.
    * Правила изменения размера задаются с помощью объектов ImageResizer и их комбинаций.
    * Возможность обрезать изображение до требуемого соотношения сторон вручную,
      используя виджет обрезки. Координаты прямоугольника обрезки могут быть сохранены в базу.
    * Размерный ряд изображения генерируется непосредственно при загрузке через Ajax,
      так что предпросмотр доступны сразу после этого.
    * При загрузке изображения у уменьшенных копий отображается прямоугольник,
      по которому они были обрезана.
    * Возможность применения фильтров Pillow.
* Группировка полей формы в схлопывающиеся блоки FieldBlock.
  Название блока может быть динамическим на основе значений вложенных полей.
* Предложение вариантов ввода символа в текстовых полях и редакторе WYSIWYG.
  Зажмите клавишу и выберите вариант из списка похожих символов.

### Расширенные возможности редактирования

* История правок для объектов в потоке.
    * Регистрация событий создания, правки, удаления и публикации 
      (и других, если это реализовано).
    * Сохранение в базе редактора, даты правки, изначального и конечного значения формы.
    * Показ журнала правок и разницы между версиями (diff).
    * Сохранение вариантов изображения в виде миниатюр.
* Возможность добавления хуков перед сохранением, с помощью которых можно отложить отправку запроса,
  предупредить редактора о возможных ошибках и т.д. В частности, выводится сообщение,
  если файл находится в процессе загрузки.
* Показ списка связанных объектов из других потоков.
* Подключаемый виджет редакторских заметок к объекту.
* Лотки для редакторов. Редактор может положить объект в лоток к коллеге с соответствующим комментарием.
* Предпросмотр объекта после редактирования или перед публикацией с использованием
  настоящего кода отображения и шаблонов страницы.

### Публикация

* Публикация объектов на основе двухверсионной системы: объекты редактируются в закрытой
  редакторской базе. Пользователь с соответствующими привелегиями может опубликовать объект,
  и он вместе со всеми правками будет перенесён в общедоступную базу.
* Базовый класс для создания классов sqlalchemy для редакторской и публичной версий объектов.
* Мультиязычные потоки (с заданным в коде набором языков).
* Возможность создавать мультиязычные объекты sqlalchemy.
  Если для определённого класса эта опция настроена, то принадлежащие разным языкам
  объекты с одинаковым идентификатором будут считаться разными языковыми версиями друг друга.
* Возможность хранения языковых версий в одной таблице или в отдельной таблице для каждого языка.
  Хранение в одной таблице может позволить иметь общие поля для всех языков
  (например, общие файлы изображений в объектах Фото и специфичные для каждого языка заголовки).
* Автоматическое выставление времени создания и последнего изменения.

### Детали реализации и прочие особенности

* Встроенные фабрики для моделей sqlalchemy.
* Возможность отправки всплывающих сообщений через cookie на клиентское приложение.
* Упаковщик JS и CSS, работающий на основе одного или нескольких файлов Manifest.
  Возможность комбинирования файлов из iktomi-cms и файлов, специфичных для приложения.

