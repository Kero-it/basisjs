/*!
 * Basis javasript library 
 * http://code.google.com/p/basis-js/
 *
 * @copyright
 * Copyright (c) 2006-2011 Roman Dvornov.
 *
 * @license
 * GNU General Public License v2.0 <http://www.gnu.org/licenses/gpl-2.0.html>
 */

basis.require('basis.dom');
basis.require('basis.dom.event');
basis.require('basis.cssom');
basis.require('basis.ui');

!function(basis){

  'use strict';

 /**
  * This namespace contains {basis.ui.tree.Tree} control class and it's
  * child nodes classes. There are two base child classes for tree
  * {basis.ui.tree.Node} and {basis.ui.tree.Folder}.
  *
  * The main difference between this classes is that
  * {basis.ui.tree.Node} has abstact {basis.ui.tree.Node#expand}
  * and {basis.ui.tree.Node#collapse} methods and can't be
  * collapsed/expanded, but {basis.ui.tree.Folder} can.
  *
  * Also this namespace has two additional classes for child nodes grouping
  * {basis.ui.tree.GroupingNode} and
  * {basis.ui.tree.PartitionNode}.
  *
  * Most part of component logic implemented in {basis.dom.wrapper} namespace,
  * and this one just contains templates and collapse/expand implementation.
  *
  * @see ./test/speed-tree.html
  * @see ./demo/simple/tree.html
  * @see ./demo/data/entity.html
  *
  * @namespace basis.ui.tree
  */

  var namespace = 'basis.ui.tree';


  //
  // import names
  //

  var Class = basis.Class;
  var DOM = basis.dom;
  var Event = basis.dom.event;

  var classList = basis.cssom.classList;
  var getter = Function.getter;
  var createEvent = basis.EventObject.createEvent;

  var UIContainer = basis.ui.Container;
  var UIControl = basis.ui.Control;
  var UIPartitionNode = basis.ui.PartitionNode;
  var UIGroupingNode = basis.ui.GroupingNode;


  //
  // main part
  //

  function expand(node){
    if (typeof node.expand == 'function')
      node.expand();
  }

  function collapse(node){
    if (typeof node.collapse == 'function')
      node.collapse();
  }

  var ExpandCollapseMixin = {
   /**
    * Expand all descendant nodes.
    */
    expandAll: function(){
      DOM.axis(this, DOM.AXIS_DESCENDANT_OR_SELF, expand);
    },

   /**
    * Collapse all descendant nodes.
    */
    collapseAll: function(){
      DOM.axis(this, DOM.AXIS_DESCENDANT_OR_SELF, collapse);
    },

    expand: Function(),
    collapse: Function(),
    toggle: Function()
  };

 /**
  * Here is an example for tree recursive childFactory
  */
  /*function treeChildFactory(config){
    if (config.childNodes)
      return new Folder(Object.complete({ childFactory: this.childFactory }, config));
    else
      return new Node(config);
  }*/

 /**
  * @class
  */
  var PartitionNode = Class(UIPartitionNode, {
    className: namespace + '.PartitionNode',
    template: 
      '<li{element} class="Basis-TreePartitionNode">' + 
        '<div class="Basis-TreePartitionNode-Title">' +
          '<span>{titleText}</span>' +
        '</div>' +
        '<ul{childNodesElement} class="Basis-TreePartitionNode-Content"/>' +
      '</li>'
  });

 /**
  * @class
  */
  var GroupingNode = Class(UIGroupingNode, {
    className: namespace + '.GroupingNode',
    childClass: PartitionNode
  });

 /**
  * Base child class for {basis.ui.tree.Tree}
  * @class
  */
  var Node = Class(UIContainer, ExpandCollapseMixin, {
    className: namespace + '.Node',

    canHaveChildren: false,
    childFactory: null,

    event_collapse: createEvent('collapse'),
    event_expand: createEvent('expand'),

   /**
    * Template for node element. 
    * @type {basis.Html.Template}
    * @private
    */
    template: 
      '<li{element} class="Basis-TreeNode">' +
        '<div{content} class="Basis-TreeNode-Title">' +
          '<span{title} class="Basis-TreeNode-Caption" event-click="select">' +
            '{titleText}' +
          '</span>' +
        '</div>' +
      '</li>',

    templateUpdate: function(tmpl, eventName, delta){
      // set new title
      tmpl.titleText.nodeValue = String(this.titleGetter(this)) || '[no title]';
    },

   /**
    * @inheritDoc
    */
    action: {
      select: function(event){
        if (!this.isDisabled())
          this.select(Event(event).ctrlKey);
      },
      toggle: function(event){
        this.toggle();
      }
    },

   /**
    * @type {function()}
    */
    titleGetter: getter('data.title')
  });

 /**
  * Base child class for {basis.ui.tree.Tree} that can has children.
  * @class
  * @extends {basis.ui.tree.Node}
  */
  var Folder = Class(Node, {
    className: namespace + '.Folder',

    canHaveChildren: true,
    childClass: Node,
    localGroupingClass: GroupingNode,

    event_expand: function(){
      Node.prototype.event_expand.call(this);
      classList(this.element).remove('collapsed');
    },
    event_collapse: function(){
      Node.prototype.event_collapse.call(this);
      classList(this.element).add('collapsed');
    },

   /**
    * Template for node element. 
    * @type {basis.Html.Template}
    * @private
    */
    template: 
      '<li{element} class="Basis-TreeNode">' +
        '<div{content} class="Basis-TreeNode-Title Basis-TreeNode-CanHaveChildren">' +
          '<div{expander} class="Basis-TreeNode-Expander" event-click="toggle"/>' +
          '<span{title} class="Basis-TreeNode-Caption" event-click="select">' +
            '{titleText}' +
          '</span>' +
        '</div>' + 
        '<ul{childNodesElement} class="Basis-TreeNode-Content"/>' + 
      '</li>',

   /**
    * @type {boolean}
    */
    collapsable: true,

   /**
    * @type {boolean}
    */
    collapsed: false,

   /**
    * @param {Object} config
    * @config {boolean} collapsable
    * @config {boolean} collapsed
    * @constructor
    */
    init: function(config){
      // inherit
      Node.prototype.init.call(this, config);

      if (this.collapsed && this.collapsable)
        this.event_collapse();
    },

   /**
    * Makes child nodes visible.
    * @return {boolean} Returns true if node was expanded.
    */
    expand: function(){
      if (this.collapsed)
      {
        this.collapsed = false;
        this.event_expand();

        return true;
      }
    },

   /**
    * Makes child nodes invisible.
    * @return {boolean} Returns true if node was collpased.
    */
    collapse: function(){
      if (!this.collapsed && this.collapsable)
      {
        this.collapsed = true;
        this.event_collapse();

        return true;
      }
    },

   /**
    * Inverts node collapsed state. If node was collapsed expand it, otherwise collapse it.
    */
    toggle: function(){
      this.collapsed ? this.expand() : this.collapse();
    }
  });

 /**
  * @class
  */
  var Tree = Class(UIControl, ExpandCollapseMixin, {
    className: namespace + '.Tree',

    childClass: Node,
    localGroupingClass: GroupingNode,

    //childFactory: treeChildFactory,

   /**
    * Template for node element. 
    * @type {basis.Html.Template}
    * @private
    */
    template:
      '<ul class="Basis-Tree"/>'
  });


  //
  // export names
  //

  basis.namespace('basis.ui').extend({
    Tree: Tree
  });

  basis.namespace('basis.ui.tree').extend({
    Tree: Tree,
    Node: Node,
    Folder: Folder,
    GroupingNode: GroupingNode,
    PartitionNode: PartitionNode
  });

}(basis);