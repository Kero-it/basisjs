
  basis.require('basis.cssom');
  basis.require('basis.timer');
  basis.require('basis.ui');
  basis.require('basis.ui.field');
  basis.require('basis.ui.popup');

  var classList = basis.cssom.classList;

  var viewPrototype = resource('views/prototype/prototype.js');
  var targetContent = resource('targetContent.js');
  
  var prototypeDataset = viewPrototype().getChildNodesDataset();


  var prototypeMapPopupPanel = new basis.ui.Node({
    template: resource('template/prototypeMapPopupPanel.tmpl'),

    binding: {
      matchInput: 'satellite:'
    },
    
    /*satellite: {
      matchInput: prototypeMapPopupMatchInput
    },*/

    childClass: basis.ui.Node.subclass({
      template: resource('template/prototypeMapPopupPanelItem.tmpl'),

      binding: {
        key: 'data:'
      },

      action: {
        scrollTo: function(){
          var element = this.delegate.element;
          targetContent().scrollTo(element);
          
          classList(element).add('highlight');
          basis.timer.nextTick(function(){ classList(element).remove('highlight'); });

          prototypeMapPopup.hide();
        }
      }
    }),
    sorting: basis.getter('data.title'),
    grouping: basis.object.slice(viewPrototype().grouping, 'groupGetter sorting childClass'.qw())
  });

  var prototypeMapPopupMatchInput = new basis.ui.field.MatchInput({
    emit_keyup: function(event){
      this.constructor.prototype.emit_keyup.call(this, event);

      var selected = prototypeMapPopup.selection.pick();
      switch (Event.key(event)){
        case Event.KEY.UP: 
          prototypeMapPopup.selection.set([selected && selected.previousSibling || prototypeMapPopup.lastChild]);
        break;
        case Event.KEY.DOWN: 
          prototypeMapPopup.selection.set([selected && selected.nextSibling || prototypeMapPopup.firstChild]);
        break;
        case Event.KEY.ENTER: 
          if (selected)
            selected.templateAction('scrollTo');
        break;
      }
    },
    matchFilter: {
      node: prototypeMapPopupPanel,
      textNodeGetter: basis.getter('tmpl.this_data_title')
    }
  });

  prototypeMapPopupPanel.setSatellite('matchInput', prototypeMapPopupMatchInput);

  var prototypeMapPopup = new basis.ui.popup.Balloon({
    template: '<b:include src="basis.ui.popup.Balloon" id="PrototypeMapPopup"/>',

    dir: 'center bottom center top',
    selection: {},

    childNodes: prototypeMapPopupPanel,

    handler: {
      beforeShow: function(){
        prototypeMapPopupPanel.setDataSource(prototypeDataset);
      },
      show: function(){
        prototypeMapPopupMatchInput.select();
      },
      hide: function(){
        prototypeMapPopupPanel.setDataSource();
        prototypeMapPopupMatchInput.setValue();
      }
    }
  });

  //
  // exports
  //
  module.exports = prototypeMapPopup;
