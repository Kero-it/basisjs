/*
  Basis javascript library
  http://github.com/basisjs/basisjs
 
  @license
  Dual licensed under the MIT or GPL Version 2 licenses.
*/

/**
 * @annotation
 * Basis library core module. It provides various most using functions
 * and base functionality.
 *
 * This file should be loaded first.
 *
 * Table of content:
 * - util functions
 * - console method wrappers
 * - path utils
 * - config load
 * - buildin class extensions and fixes
 *   o Function
 *   o Array
 *   o String
 *   o Number
 *   o Date (more extensions for Date in src/basis/date.js)
 * - namespace sheme (module subsystem)
 * - resouces
 * - basis.Class namespace
 * - cleaner
 * - Token
 * - basis.ready
 */

// Define global scope: `window` in browser, or `global` on node.js
;(function(global){

  'use strict';

  //
  // import names
  //

  var document = global.document;
  var prefetchedResources = global.__resources__;


 /**
  * Object extensions
  * @namespace Object
  */

 /**
  * Returns first not null value.
  * @param {...*} args
  * @return {*}
  */
  function coalesce(/* arg1 .. argN */){
    for (var i = 0; i < arguments.length; i++)
      if (arguments[i] != null)
        return arguments[i];
  }

 /**
  * Copy all properties from source (object) to destination object.
  * @param {object} dest Object should be extended.
  * @param {object} source
  * @return {object} Destination object.
  */
  function extend(dest, source){
    for (var key in source)
      dest[key] = source[key];

    return dest;
  }

 /**
  * Copy only missed properties from source (object) to object.
  * @param {object} dest Object should be completed.
  * @param {object} source
  * @return {object} Destination object.
  */
  function complete(dest, source){
    for (var key in source)
      if (key in dest == false)
        dest[key] = source[key];

    return dest;
  }

 /**
  * Returns all property names of object.
  * @param {object} object Any object can has properties.
  * @return {Array.<string>}
  */
  function keys(object){
    var result = [];

    for (var key in object)
      result.push(key);

    return result;
  }

 /**
  * Returns all property values of object.
  * @param {object} object Any object can has properties.
  * @return {Array.<object>}
  */
  function values(object){
    var result = [];

    for (var key in object)
      result.push(object[key]);

    return result;
  }

 /**
  * Creates a slice of source object.
  * @param {object} source Any object can has properties.
  * @param {Array.<string>} keys Desired key set.
  * @return {object} New object with desired keys from source object.
  */
  function slice(source, keys){
    var result = {};

    if (!keys)
      return extend(result, source);

    for (var i = 0, key; key = keys[i++];)
      if (key in source)
        result[key] = source[key];

    return result;
  }

 /**
  * Creates a slice of source object and delete keys from source.
  * @param {object} source Any object can has properties.
  * @param {Array.<string>} keys Desired key set.
  * @return {object} New object with desired keys from source object.
  * TODO: fix case when keys is not passed; it returns copy of source,
  *       but doesn't delete anything (source should become empty object)
  */
  function splice(source, keys){
    var result = {};

    if (!keys)
      return extend(result, source);

    for (var i = 0, key; key = keys[i++];)
      if (key in source)
      {
        result[key] = source[key];
        delete source[key];
      }

    return result;
  }

 /**
  * Merge several objects into new object and returns it.
  * @param {...*} args
  * @return {object}
  */ 
  function merge(/* obj1 .. objN */){
    return arrayFrom(arguments).reduce(extend, {});
  }  

 /**
  * Returns list of callback call result for every object's key-value pair.
  * @param {object} object Any object can has properties.
  * @param {function(key, value)} callback
  * @param {*=} thisObject
  * @return {Array.<*>}
  */
  function iterate(object, callback, thisObject){
    var result = [];

    for (var key in object)
      result.push(callback.call(thisObject, key, object[key]));

    return result;
  }


 /**
  * Function extensions
  * @namespace Function
  */

 /**
  * @param {*} value
  * @return {boolean} Returns true if value is undefined.
  */
  function $undefined(value){
    return value == undefined;
  }

 /**
  * @param {*} value
  * @return {boolean} Returns true if value is not undefined.
  */
  function $defined(value){
    return value != undefined;
  }

 /**
  * @param {*} value
  * @return {boolean} Returns true if value is null.
  */
  function $isNull(value){
    return value == null || value == undefined;
  }

 /**
  * @param {*} value
  * @return {boolean} Returns true if value is not null.
  */
  function $isNotNull(value){
    return value != null && value != undefined;
  }

 /**
  * @param {*} value
  * @return {boolean} Returns true if value is equal (===) to this.
  */
  function $isSame(value){
    return value === this;
  }

 /**
  * @param {*} value
  * @return {boolean} Returns true if value is not equal (!==) to this.
  */
  function $isNotSame(value){
    return value !== this;
  }

 /**
  * nothing to do, just returns first argument.
  * @param {*} value
  * @return {*} Returns first argument.
  */
  function $self(value){
    return value;
  }

 /**
  * Returns a function that always returns the same value.
  * @param {*} value
  * @return {function()}
  */
  function $const(value){
    return function(){ return value; };
  }

 /**
  * Always returns false.
  * @return {boolean}
  */
  function $false(){
    return false;
  }

 /**
  * Always returns true.
  * @return {boolean}
  */
  function $true(){
    return true;
  }

 /**
  * Always returns null.
  */
  function $null(){
    return null;
  }

 /**
  * Always returns undefined.
  */
  function $undef(){
  }

 /**
  * @param {function(object)|string} path
  * @param {function(value)|string|object=} modificator
  * @return {function(object)} Returns function that resolve some path in object and can use modificator for value transformation.
  */
  var getter = (function(){
    var modificatorSeed = 1;
    var simplePath = /^[a-z$_][a-z$_0-9]*(\.[a-z$_][a-z$_0-9]*)*$/i;

    var getterMap = [];
    var pathCache = {};
    var modCache = {};

    function buildFunction(path){
      if (simplePath.test(path))
      {
        var parts = path.split('.');
        var foo = parts[0];
        var bar = parts[1];
        var baz = parts[2];
        var fn;

        switch (parts.length)
        {
          case 1:
            fn = function(object){
              return object != null ? object[foo] : object;
            };
            break;
          case 2:
            fn = function(object){
              return object != null ? object[foo][bar] : object;
            };
            break;
          case 3:
            fn = function(object){
              return object != null ? object[foo][bar][baz] : object;
            };
            break;
          default:
            fn = function(object){
              if (object != null)
              {
                object = object[foo][bar][baz];
                for (var i = 3, key; key = parts[i]; i++)
                  object = object[key];
              }

              return object;
            };
        }

        // verbose function code in dev mode
        /** @cut */ fn = Function('parts', 'return ' + fn.toString()
        /** @cut */   .replace(/(foo|bar|baz)/g, function(m, w){
        /** @cut */      return '"' + parts[w == 'foo' ? 0 : (w == 'bar' ? 1 : 2)] + '"';
        /** @cut */    })
        /** @cut */   .replace(/\[\"([^"]+)\"\]/g, '.$1'))(parts);
        
        return fn;
      }

      return new Function('object', 'return object != null ? object.' + path + ' : object');
    }

    return function(path, modificator){
      var func;
      var result;
      var getterId;

      // return nullGetter if no path or nullGetter passed
      if (!path || path === nullGetter)
        return nullGetter;

      // resolve getter by path
      if (typeof path == 'function')
      {
        getterId = path.basisGetterId_;

        // path is function
        if (getterId)
        {
          // this function used for getter before
          func = getterMap[Math.abs(getterId) - 1];
        }
        else
        {
          // this function never used for getter before, wrap and cache it

          // wrap function to prevent function properties rewrite
          func = function(object){ return path(object); };
          func.base = path;
          func.__extend__ = getter;

          // add to cache
          getterId = getterMap.push(func);
          path.basisGetterId_ = -getterId;
          func.basisGetterId_ = getterId;
        }
      }
      else
      {
        // thread path as string, search in cache
        func = pathCache[path];

        if (func)
        {
          // resolve getter id
          getterId = func.basisGetterId_;
        }
        else
        {
          // create getter function
          func = buildFunction(path);
          func.base = path;
          func.__extend__ = getter;

          // add to cache
          getterId = getterMap.push(func);
          func.basisGetterId_ = getterId;
          pathCache[path] = func;
        }
      }

      // resolve getter with modificator
      var modType = modificator != null && typeof modificator;

      // if no modificator, return func
      if (!modType)
        return func;

      var modList = modCache[getterId];
      var modId;

      // resolve modificator id if possible
      if (modType == 'string')
        modId = modType + modificator;
      else
        if (modType == 'function')
          modId = modificator.basisModId_;
        else
          if (modType != 'object')
          {
            // only string, function and objects are support as modificator
            ;;;consoleMethods.warn('basis.getter: wrong modificator type, modificator not used, path: ', path, ', modificator:', modificator);

            return func;
          }

      // try fetch getter from cache
      if (modId && modList && modList[modId])
        return modList[modId];

      // recover original function, reduce functions call deep
      if (typeof func.base == 'function')
        func = func.base;

      switch (modType)
      {
        case 'string':
          result = function(object){
            return modificator.format(func(object));
          };
        break;

        case 'function':
          if (!modId)
          {
            // mark function with modificator id
            modId = modType + modificatorSeed++;
            modificator.basisModId_ = modId;
          }

          result = function(object){
            return modificator(func(object));
          };
        break;

        default: //case 'object':
          result = function(object){
            return modificator[func(object)];
          };
      }

      result.base = func.base || func;
      result.__extend__ = getter;

      if (modId)
      {
        if (!modList)
        {
          // create new modificator list if it not exists yet
          modList = {};
          modCache[getterId] = modList;
        }

        // cache getter with modificator
        modList[modId] = result;
        result.mod = modificator;

        // cache new getter
        result.basisGetterId_ = getterMap.push(result);
      }
      else
      {
        // only object modificators has no modId
        // getters with object modificator are not caching
        // this prevents of storing (in closure) object that can't be released by gabage collectors
      }

      return result;
    };
  })();

  var nullGetter = extend(function(){}, {
    __extend__: getter
  });

 /**
  * @param {function(object)|string|object} getter
  * @param {*} defValue
  * @param {function(value):boolean} checker
  * @return {function(object)}
  */
  function def(getter, defValue, checker){
    checker = checker || $isNull;
    return function(object){
      var res = getter(object);
      return checker(res) ? defValue : res;
    };
  }

 /**
  * @param {string} key
  * @return {object}
  */
  function wrapper(key){
    return function(value){
      var result = {};
      result[key] = value;
      return result;
    };
  }

 /**
  * @param {function()} init Function that should be called at first time.
  * @param {Object=} thisObject
  * @return {function()} Returns lazy function.
  */
  function lazyInit(init, thisObject){
    var inited = 0, self, data;
    return self = function(){
      if (!inited++)
      {
        self.inited = true;  // DON'T USE THIS PROPERTY, IT'S FOR DEBUG PURPOSES ONLY
        self.data =          // DON'T USE THIS PROPERTY, IT'S FOR DEBUG PURPOSES ONLY
        data = init.apply(thisObject || this, arguments);
        ;;;if (typeof data == 'undefined') consoleMethods.warn('lazyInit function returns nothing:\n' + init);
      }
      return data;
    };
  }

 /**
  * @param {function()} init Function that should be called at first time.
  * @param {function()} run Function that will be called all times.
  * @param {Object=} thisObject
  * @return {function()} Returns lazy function.
  */
  function lazyInitAndRun(init, run, thisObject){
    var inited = 0, self, data;
    return self = function(){
      if (!inited++)
      {
        self.inited = true;  // DON'T USE THIS PROPERTY, IT'S FOR DEBUG PURPOSES ONLY
        self.data =          // DON'T USE THIS PROPERTY, IT'S FOR DEBUG PURPOSES ONLY
        data = init.call(thisObject || this);
        ;;;if (typeof data == 'undefined') consoleMethods.warn('lazyInitAndRun function returns nothing:\n' + init);
      }
      run.apply(data, arguments);
      return data;
    };
  }

 /**
  * @param {function()} run Function that will be called only once.
  * @param {Object=} thisObject
  * @return {function()} Returns lazy function.
  */
  function runOnce(run, thisObject){
    var fired = 0;
    return function(){
      if (!fired++)
        return run.apply(thisObject || this, arguments);
    };
  }

 /**
  * Retuns function body code
  * @return {string}
  */
  function functionBody(fn){
    return fn.toString().replace(/^\s*\(?\s*function[^(]*\([^\)]*\)[^{]*\{|\}\s*\)?\s*$/g, '');
  }


  // ============================================
  // safe console method wrappers
  //

  var consoleMethods = (function(){
    var methods = {
      log: $undef,
      info: $undef,
      warn: $undef
    };

    if (typeof console != 'undefined')
      iterate(methods, function(methodName){
        methods[methodName] = 'bind' in Function.prototype && typeof console[methodName] == 'function'
          ? Function.prototype.bind.call(console[methodName], console)
            // ie8 and lower, it's also more safe when Function.prototype.bind defined
            // by other libraries (like es5-shim)
          : function(){
              Function.prototype.apply.call(console[methodName], console, arguments)
            };
      });

    return methods;
  })();

  
  // ============================================
  // path utils
  //

  var NODE_ENV = typeof process != 'undefined' && process.versions && process.versions.node;
  var pathUtils = (function(){
    var utils;

    if (NODE_ENV)
    {
      utils = slice(require('path'), [
        'normalize',
        'dirname',
        'extname',
        'basename',
        'resolve',
        'relative'
      ]);

      var existsSync = require('fs').existsSync;
      if (existsSync)
        utils.existsSync = existsSync;
    }
    else
    {
      var linkEl = document.createElement('A');

      utils = {
        normalize: function(path){
          linkEl.href = path || '';
          //linkEl.href = linkEl.pathname;
          return linkEl.href.substring(0, linkEl.href.length - linkEl.hash.length - linkEl.search.length);
        },
        dirname: function(path){
          return this.normalize(path).replace(/\/[^\/]*$/, '');
        },
        extname: function(path){
          var ext = String(path).match(/\.[a-z0-9_\-]+$/);
          return ext ? ext[0] : '';
        },
        basename: function(path, ext){
          var filename = String(path).match(/[^\\\/]*$/);
          filename = filename ? filename[0] : '';

          if (ext == this.extname(filename))
            filename = filename.substring(0, filename.length - ext.length);

          return filename;
        },
        resolve: function(path){  // TODO: more compliant with node.js
          return this.normalize(path);
        },
        relative: function(path){
          var abs = this.normalize(path).split(/\//);
          var loc = this.baseURI.split(/\//);
          var i = 0;

          while (abs[i] == loc[i] && typeof loc[i] == 'string')
            i++;

          var prefix = '';
          for (var j = loc.length - i; j >= 0; j--)
            prefix += '../';

          return prefix + abs.slice(i).join('/');
        }
      };
    }

    utils.baseURI = utils.dirname(utils.resolve());

    return utils;
  })();


  // =============================================
  // apply config
  //

  var config = (function(){
    var basisUrl = '';
    var config = {
      'es5shim': true,
      'legacy': true      // TODO: set to false by default
    };

    if (NODE_ENV)
    {
      // node.js env
      basisUrl = __dirname;
    }
    else
    {
      // browser env
      var scripts = document.getElementsByTagName('script');
      for (var i = 0, scriptEl; scriptEl = scripts[i]; i++)
      {
        var configAttrNode = scriptEl.getAttributeNode('data-basis-config') || scriptEl.getAttributeNode('basis-config')
        if (configAttrNode)
        {
          try {
            extend(config, Function('return{' + configAttrNode.nodeValue + '}')() || {});
          } catch (e) {
            ;;;consoleMethods.warn('basis.js config parse fault: ' + e);
          }

          basisUrl = pathUtils.dirname(scriptEl.src);

          break;
        }
      }
    }

    config.path = extend(config.path || {}, {
      basis: basisUrl
    });
      
    var autoload = config.autoload;
    config.autoload = false;
    if (autoload)
    {
      var m = autoload.match(/^((?:[^\/]*\/)*)([a-z$_][a-z0-9$_]*)((?:\.[a-z$_][a-z0-9$_]*)*)$/i);
      if (m)
      {
        if (m[2] != 'basis')
        {
          config.autoload = m[2] + (m[3] || '');
          if (m[1])
            config.path[m[2]] = m[1].replace(/\/$/, '');
        }
        else
        {
          ;;;consoleMethods.warn('value for autoload can\'t be `basis` (setting ignored): ' + autoload);
        }
      }
      else
      {
        ;;;consoleMethods.warn('wrong autoload value (setting ignored): ' + autoload);
      }
    }

    for (var key in config.path)
      config.path[key] = pathUtils.resolve(config.path[key] + '/');

    return config;
  })();


  // ============================================
  // Namespace subsystem
  //

  var namespaces = {};
  var getNamespace = function(path, wrapFunction){
    var cursor = global;
    var nsRoot;

    path = path.split('.');
    for (var i = 0, name; name = path[i]; i++)
    {
      if (!cursor[name])
      {
        var nspath = path.slice(0, i + 1).join('.');

        // create new namespace
        cursor[name] = (function(path, wrapFn){
         /**
          * @returns {*|undefined}
          */
          function namespace(){
            if (wrapFunction)
              return wrapFunction.apply(this, arguments);
          }

          var wrapFunction = typeof wrapFn == 'function' ? wrapFn : null;
          var pathFn = function(name){
            return path + (name ? '.' + name : '');
          };
          pathFn.toString = $const(path);

          return extend(namespace, {
            path: pathFn,
            exports: {
              path: pathFn
            },
            toString: $const('[basis.namespace ' + path + ']'),
            extend: function(names){
              extend(this.exports, names);
              return complete(this, names);
            },
            setWrapper: function(wrapFn){
              if (typeof wrapFn == 'function')
              {
                ;;;if (wrapFunction) consoleMethods.warn('Wrapper for ' + path + ' is already set. Probably mistake here.');
                wrapFunction = wrapFn;
              }
            }
          });
        })(nspath, i < path.length ? wrapFunction : null);

        if (nsRoot)
          nsRoot.namespaces_[nspath] = cursor[name];
      }

      cursor = cursor[name];

      if (!nsRoot)
      {
        nsRoot = cursor;
        if (!nsRoot.namespaces_)
          nsRoot.namespaces_ = {};
      }
    }

    namespaces[path.join('.')] = cursor;

    return cursor;
  }  


  // ============================================
  // OOP section: Class implementation
  //

  var Class = (function(){

   /**
    * This namespace introduce class creation scheme. It recomended for new
    * classes creation, but use able to use buildin sheme for your purposes.
    *
    * The main benefits that provides by this sheme, that all methods are able
    * to call inherited method (via this.inherit(args..)), like in other OO
    * languages. All Basis classes and components (with some exceptions) are
    * building using this sheme.
    * @example
    *   var classA = basis.Class(null, { // you can use basis.Class instead of null
    *     name: 'default value',
    *     init: function(title){ // special method - constructor
    *       this.title = title;
    *     },
    *     say: function(){
    *       return 'My name is {0}.'.format(this.title);
    *     }
    *   });
    *
    *   var classB = basis.Class(classA, {
    *     age: 0,
    *     init: function(title, age){
    *       classA.prototype.init.call(this, title);
    *       this.age = age;
    *     },
    *     say: function(){
    *       return classA.prototype.say.call(this) + ' I\'m {0} year old.'.format(this.age);
    *     }
    *   });
    *
    *   var foo = new classA('John');
    *   var bar = new classB('Ivan', 25);
    *   alert(foo.say()); // My name is John.
    *   alert(bar.say()); // My name is Ivan. I'm 25 year old.
    *   alert(bar instanceof basis.Class); // false (for some reasons it false now)
    *   alert(bar instanceof classA); // true
    *   alert(bar instanceof classB); // true
    * @namespace basis.Class
    */

    var namespace = 'basis.Class';


   /**
    * Root class for all classes created by Basis class model.
    */
    var BaseClass = function(){};

   /**
    * Global instances seed.
    */
    var seed = { id: 1 };
    var classSeed = 1;
    var NULL_FUNCTION = function(){};

   /**
    * Class construct helper: self reference value
    */
    var SELF = {};

   /**
    * Test object is it a class.
    * @func
    * @param {Object} object
    * @return {boolean} Returns true if object is class.
    */
    function isClass(object){
      return typeof object == 'function' && !!object.basisClassId_;
    }

   /**
    * @func
    */
    function isSubclassOf(superClass){
      var cursor = this;
      while (cursor && cursor !== superClass)
        cursor = cursor.superClass_;
      return cursor === superClass;
    }

   /**
    * @func
    * dev mode only
    */
    function dev_verboseNameWrap(name, args, fn){
      return new Function(keys(args), 'return {"' + name + '": ' + fn + '\n}["' + name + '"]').apply(null, values(args));
    }


    // test is toString property enumerable
    var TOSTRING_BUG = (function(){
      for (var key in { toString: 1 })
        return false;
      return true;
    })();


    //
    // main class object
    //
    extend(BaseClass, {
      // Base class name
      className: namespace,

      extendConstructor_: false,

      // prototype defaults
      prototype: {
        constructor: null,
        init: NULL_FUNCTION,
        postInit: NULL_FUNCTION,
        toString: function(){
          return '[object ' + (this.constructor || this).className + ']';
        },
        destroy: function(){
          for (var prop in this)
            this[prop] = null;

          this.destroy = $undef;
        }
      },

     /**
      * Class constructor.
      * @param {function()} SuperClass Class that new one inherits of.
      * @param {...object} extensions Objects that extends new class prototype.
      * @return {function()} A new class.
      */
      create: function(SuperClass, extensions){
        var classId = classSeed++;        

        if (typeof SuperClass != 'function')
          SuperClass = BaseClass;

        /** @cut */ var className = '';

        /** @cut */ for (var i = 1, extension; extension = arguments[i]; i++)
        /** @cut */   if (typeof extension != 'function' && extension.className)
        /** @cut */     className = extension.className;

        /** @cut */ if (!className)
        /** @cut */   className = SuperClass.className + '._Class' + classId;
        /** @cut */// consoleMethods.warn('Class has no name');

        // temp class constructor with no init call
        var NewClassProto = function(){};

        // verbose name in dev
        /** @cut */ NewClassProto = dev_verboseNameWrap(className, {}, NewClassProto);

        NewClassProto.prototype = SuperClass.prototype;

        var newProto = new NewClassProto;
        var newClassProps = {
          /** @cut */ className: className,

          basisClassId_: classId,
          superClass_: SuperClass,
          extendConstructor_: !!SuperClass.extendConstructor_,

          // class methods
          isSubclassOf: isSubclassOf,
          subclass: function(){
            return BaseClass.create.apply(null, [newClass].concat(arrayFrom(arguments)));
          },
          extend: BaseClass.extend,
          // auto extend creates a subclass
          __extend__: function(value){
            if (value && value !== SELF && (typeof value == 'object' || (typeof value == 'function' && !isClass(value))))
              return BaseClass.create.call(null, newClass, value);
            else
              return value;
          },

          // new class prototype
          prototype: newProto
        };

        // extend newClass prototype
        for (var i = 1, extension; extension = arguments[i]; i++)
        {
          newClassProps.extend(
            typeof extension == 'function' && !isClass(extension)
              ? extension(SuperClass.prototype)
              : extension
          );
        }


        /** @cut */if (newProto.init != NULL_FUNCTION && !/^function[^(]*\(\)/.test(newProto.init) && newClassProps.extendConstructor_) consoleMethods.warn('probably wrong extendConstructor_ value for ' + newClassProps.className);

        // new class constructor
        var newClass = newClassProps.extendConstructor_
          // constructor with instance extension
          ? function(extend){
              // mark object
              this.basisObjectId = seed.id++;

              // extend and override instance properties
              var prop;
              for (var key in extend)
              {
                prop = this[key];
                this[key] = prop && prop.__extend__
                  ? prop.__extend__(extend[key])
                  : extend[key];
              }

              // call constructor
              this.init();

              // post init
              this.postInit();
            }

          // simple constructor
          : function(){
              // mark object
              this.basisObjectId = seed.id++;

              // call constructor
              this.init.apply(this, arguments);

              // post init
              this.postInit();
            };

        // verbose name in dev
        // NOTE: this code makes Chrome and Firefox show class name in console
        ;;;newClass = dev_verboseNameWrap(className, { seed: seed }, newClass);

        // add constructor property to prototype
        newProto.constructor = newClass;

        for (var key in newProto)
          if (newProto[key] === SELF)
            newProto[key] = newClass;
          //else
          //  newProto[key] = newProto[key];

        // extend constructor with properties
        extend(newClass, newClassProps);

        return newClass;
      },

     /**
      * Extend class prototype
      * @param {Object} source If source has a prototype, it will be used to extend current prototype.
      * @return {function()} Returns `this`.
      */
      extend: function(source){
        var proto = this.prototype;

        if (source.prototype)
          source = source.prototype;

        for (var key in source)
        {
          var value = source[key];
          var protoValue = proto[key];

          if (key == 'className' || key == 'extendConstructor_')
            this[key] = value;
          else
          {
            if (protoValue && protoValue.__extend__)
              proto[key] = protoValue.__extend__(value);
            else
            {
              proto[key] = value;
              //;;;if (value && !value.__extend__ && (value.constructor == Object || value.constructor == Array)){ consoleMethods.warn('!' + key); }
            }
          }
        }

        // for browsers that doesn't enum toString
        if (TOSTRING_BUG && source[key = 'toString'] !== Object.prototype[key])
          proto[key] = source[key];

        return this;
      }
    });


   /**
    * @func
    */
    var customExtendProperty = function(extension, func, devName){
      return {
        __extend__: function(extension){
          if (!extension)
            return extension;

          if (extension && extension.__extend__)
            return extension;

          var Base = function(){};
          /** @cut verbose name in dev */Base = dev_verboseNameWrap(devName || 'customExtendProperty', {}, Base);
          Base.prototype = this;
          var result = new Base;
          func(result, extension);
          return result;
        }
      }.__extend__(extension || {});
    };


   /**
    * @func
    */
    var extensibleProperty = function(extension){
      return customExtendProperty(extension, extend, 'extensibleProperty');
    };


   /**
    * @func
    */
    var nestedExtendProperty = function(extension){
      return customExtendProperty(extension, function(result, extension){
        for (var key in extension)
        {
          var value = result[key];
          result[key] = value && value.__extend__
            ? value.__extend__(extension[key])
            : extensibleProperty(extension[key]);
        }
      }, 'nestedExtendProperty');
    };

   /**
    * @func
    */
    var oneFunctionProperty = function(fn, keys){
      var create = function(keys){
        var result;

        if (keys)
        {
          if (keys.__extend__)
            return keys;

          result = {
            __extend__: create
          };

          // verbose name in dev
          ;;;var Cls = dev_verboseNameWrap('oneFunctionProperty', {}, function(){}); result = new Cls; result.__extend__ = create;

          for (var key in keys)
            if (keys[key])
              result[key] = fn;
        }

        return result;
      };

      return create(keys || {});
    };


    //
    // export names
    //

    return getNamespace(namespace, BaseClass.create).extend({
      SELF: SELF,
      BaseClass: BaseClass,
      create: BaseClass.create,
      isClass: isClass,
      customExtendProperty: customExtendProperty,
      extensibleProperty: extensibleProperty,
      nestedExtendProperty: nestedExtendProperty,
      oneFunctionProperty: oneFunctionProperty
    });
  })();


  // ============================================
  // Main part
  //  

 /**
  * @namespace basis
  */

 /**
  * @class
  */
  var Token = Class(null, {
    className: 'basis.Token',

    handlers: null,

    bindingBridge: {
      attach: function(host, fn, context){
        return host.attach(fn, context);
      },
      detach: function(host, fn, context){
        return host.detach(fn, context);
      },
      get: function(host){
        return host.get();
      }
    },

    set: function(value){
    },
    get: function(){
    },

    attach: function(fn, context){
      var cursor = this;

      while (cursor = cursor.handlers)
        if (cursor.fn === fn && cursor.context === context)
          return false;

      this.handlers = {
        fn: fn,
        context: context,
        handlers: this.handlers
      };

      return true;
    },
    detach: function(fn, context){
      var cursor = this;
      var prev = this;

      while (cursor = cursor.handlers)
      {
        if (cursor.fn === fn && cursor.context === context)
        {
          prev.handlers = cursor.handlers;
          return true;
        }

        prev = cursor;
      }

      return false;
    },

    apply: function(){
      var value = this.get();
      var cursor = this;

      while (cursor = cursor.handlers)
        cursor.fn.call(cursor.context, value);
    },

    // destructor
    destroy: function(){
      this.handlers = null;
    }  
  });  


  //
  // Resources
  //

  var resourceCache = {};
  var requestResourceCache = {};

  // apply prefetched resources to cache
  (function(){
    if (prefetchedResources)
      for (var key in prefetchedResources)
        requestResourceCache[pathUtils.resolve(key)] = prefetchedResources[key];

    prefetchedResources = null; // reset prefetched to reduce memory leaks
  })();

  var getResourceContent = function(url, ignoreCache){
    if (ignoreCache || !requestResourceCache.hasOwnProperty(url))
    {
      var resourceContent = '';

      if (!NODE_ENV)
      {
        var req = new XMLHttpRequest();
        req.open('GET', url, false);
        // set if-modified-since header since begining prevents cache using;
        // otherwise browser could never ask server for new file content
        // and use file content from cache
        req.setRequestHeader('If-Modified-Since', new Date(0).toGMTString());
        req.send('');

        if (req.status >= 200 && req.status < 400)
          resourceContent = req.responseText;
        else
        {
          ;;;consoleMethods.warn('basis.resource: Unable to load ' + url);
        }
      }
      else
      {
        if (pathUtils.existsSync(url))
          resourceContent = require('fs').readFileSync(url, 'utf-8');
        else
        {
          ;;;consoleMethods.warn('basis.resource: Unable to load ' + url);
        }
      }

      requestResourceCache[url] = resourceContent;
    }

    return requestResourceCache[url];
  };

  // basis.resource  
  var getResource = function(resourceUrl){
    resourceUrl = pathUtils.resolve(resourceUrl);

    if (!resourceCache[resourceUrl])
    {
      var extWrapper = getResource.extensions[pathUtils.extname(resourceUrl)];
      var resourceObject;
      var wrapped = false;
      var resource = function(){
        if (extWrapper)
        {
          if (!wrapped)
          {
            resourceObject = extWrapper(getResourceContent(resourceUrl), resourceUrl);
            wrapped = true;              
          }
          return resourceObject;
        }

        return getResourceContent(resourceUrl);
      };

      extend(resource, new Token());
      extend(resource, {
        url: resourceUrl,
        fetch: resource,
        toString: function(){
          return '[basis.resource ' + resourceUrl + ']';
        },
        update: function(newContent, force){
          newContent = String(newContent);
          if (force || newContent != requestResourceCache[resourceUrl])
          {
            requestResourceCache[resourceUrl] = newContent;
            if (extWrapper && wrapped)
            {
              if (!extWrapper.updatable)
                return;

              resourceObject = extWrapper(newContent, resourceUrl);
            }

            this.apply();
          }
        },
        reload: function(){
          var oldContent = requestResourceCache[resourceUrl];
          var newContent = getResourceContent(resourceUrl, true);

          if (newContent != oldContent)
            this.update(newContent, true);
        },
        get: function(source){
          return source ? getResourceContent(resourceUrl) : resource();
        }
      });

      resourceCache[resourceUrl] = resource;
    }

    return resourceCache[resourceUrl];
  };

  extend(getResource, {
    getFiles: function(){
      var result = [];

      for (var url in resourceCache)
        result.push(pathUtils.relative(url));
      
      return result;
    },
    getSource: function(resourceUrl){
      return getResourceContent(pathUtils.resolve(resourceUrl));
    },
    exists: function(resourceUrl){
      return !!resourceCache.hasOwnProperty(pathUtils.resolve(resourceUrl));
    },
    extensions: {
      '.js': function(resource, url){
        return runScriptInContext({ exports: {} }, url, resource).exports;
      },
      '.json': extend(function(resource, url){
        if (typeof resource == 'object')
          return resource;

        var result;
        try {
          result = JSON.parse(String(resource));
        } catch(e) {
          ;;;consoleMethods.warn('basis.resource: Can\'t parse JSON from ' + url, { url: url, source: String(resource) });
        }
        return result || null;
      }, {
        updatable: true
      })
    }
  });


  var runScriptInContext = function(context, sourceURL, sourceCode){
    var baseURL = pathUtils.dirname(sourceURL) + '/';
    var compiledSourceCode = sourceCode;

    if (!context.exports)
      context.exports = {};

    // compile context function
    if (typeof compiledSourceCode != 'function')
      try {
        compiledSourceCode = new Function('exports, module, basis, global, __filename, __dirname, resource',
          '"use strict";\n\n' +
          sourceCode +
          '//@ sourceURL=' + sourceURL
        );
      } catch(e) {
        ;;;var src = document.createElement('script');src.src = sourceURL;src.async = false;document.head.appendChild(src);document.head.removeChild(src);
        throw 'Compilation error ' + sourceURL + ':\n' + ('stack' in e ? e.stack : e);
        //return;
      }

    // run
    compiledSourceCode.call(
      context.exports,
      context.exports,
      context,
      basis,
      global,
      sourceURL,
      baseURL,
      function(relativePath){
        return getResource(baseURL + relativePath);
      }
    );

    return context;
  };


  // ============================================
  // extensions
  //

  if (config.es5shim)
    getResource(config.path.basis + 'es5-shim.js').fetch();

  function extendPrototype(Class, methods){
    iterate(methods, function(methodName, method){
      Class.prototype[methodName] = function(){
        // console.log('func', methodName);
        return method.apply(null, [this].concat(arraySlice.call(arguments)));
      };
    });
  }

 /**
  * Array extensions
  * @namespace Array
  */

  function arrayFrom(object, offset){
    if (object != null)
    {
      var len = object.length;

      if (typeof len == 'undefined')
        return [object];

      if (!offset)
        offset = 0;

      if (len - offset > 0)
      {
        for (var result = [], k = 0, i = offset; i < len;)
          result[k++] = object[i++];
        return result;
      }
    }

    return [];
  }

  function createArray(length, fillValue, thisObject){
    var result = [];
    var isFunc = typeof fillValue == 'function';

    for (var i = 0; i < length; i++)
      result[i] = isFunc ? fillValue.call(thisObject, i, result) : fillValue;

    return result;
  }

  var arraySlice = Array.prototype.slice;
  var arrayConcat = Array.prototype.concat;
  var arraySplice = Array.prototype.splice;

  var arrayExt = {
    // extractors
    flatten: function(array){
      return arrayConcat.apply([], array);
    },
    repeat: function(array, count){
      return createArray(parseInt(count, 10) || 0, array).flatten();
    },
 
    // getters
    item: function(array, index){
      index = parseInt(index || 0, 10);
      return array[index >= 0 ? index : array.length + index];
    },
 
    // search
   /**
    * Returns first item where getter(item) === value
    * @example
    *   var list = [{ a: 1, b: 2 }, { a: 2, b: 3 }, { a: 1, b: 4}, { a: 5 }];
    *
    *   // search for item where object.a == 2
    *   var result = list.search(5, 'a');
    *     // result -> { a: 5 }
    *
    *   // search for where a == 1 && b > 2
    *   var result = list.search(true, function(object){ return object.a == 1 && object.b > 2 });
    *     // result -> { a: 1, b: 3 }
    *
    *   // search all items where a == 1
    *   var result = new Array();
    *   var item = list.search(1, 'a');
    *   while (item)
    *   {
    *     result.push(item)
    *     item = list.search(1, 'a', Array.lastSearchIndex + 1);
    *                                   // lastSearchIndex store index of last founded item
    *   }
    *     // result -> [{ a: 1, b: 2 }, { a: 1, b: 4}]
    *
    *   // but if you need all items of array with filtered by condition use Array#filter method instead
    *   var result = list.filter(basis.getter('a == 1'));
    *
    * @param {Array} array
    * @param {*} value
    * @param {function(object)|string} getter_
    * @param {number=} offset
    * @return {*}
    */
    search: function(array, value, getter_, offset){
      Array.lastSearchIndex = -1;
      getter_ = getter(getter_ || $self);
 
      for (var i = parseInt(offset, 10) || 0, len = array.length; i < len; i++)
        if (getter_(array[i]) === value)
          return array[Array.lastSearchIndex = i];
    },
 
   /**
    * @param {Array} array
    * @param {*} value
    * @param {function(object)|string} getter_
    * @param {number=} offset
    * @return {*}
    */
    lastSearch: function(array, value, getter_, offset){
      Array.lastSearchIndex = -1;
      getter_ = getter(getter_ || $self);
 
      var len = array.length;
      var index = isNaN(offset) || offset == null ? len : parseInt(offset, 10);
 
      for (var i = index > len ? len : index; i-- > 0;)
        if (getter_(array[i]) === value)
          return array[Array.lastSearchIndex = i];
    },
 
   /**
    * Binary search in ordered array where getter(item) === value and return position.
    * When strong parameter equal false insert position returns.
    * Otherwise returns position of founded item, but -1 if nothing found.
    * @param {Array} array
    * @param {*} value Value search for
    * @param {function(object)|string=} getter_
    * @param {boolean=} desc Must be true for reverse sorted arrays.
    * @param {boolean=} strong If true - returns result only if value found.
    * @param {number=} left Min left index. If omit it equals to zero.
    * @param {number=} right Max right index. If omit it equals to array length.
    * @return {number}
    */
    binarySearchPos: function(array, value, getter_, desc, strong, left, right){
      if (!array.length)  // empty array check
        return strong ? -1 : 0;
 
      getter_ = getter(getter_ || $self);
      desc = !!desc;
 
      var pos, compareValue;
      var l = isNaN(left) ? 0 : left;
      var r = isNaN(right) ? array.length - 1 : right;
 
      do
      {
        pos = (l + r) >> 1;
        compareValue = getter_(array[pos]);
        if (desc ? value > compareValue : value < compareValue)
          r = pos - 1;
        else
          if (desc ? value < compareValue : value > compareValue)
            l = pos + 1;
          else
            return value == compareValue ? pos : (strong ? -1 : 0);  // founded element
                                                      // -1 returns when it seems as founded element,
                                                      // but not equal (array item or value looked for have wrong data type for compare)
      }
      while (l <= r);
 
      return strong ? -1 : pos + ((compareValue < value) ^ desc);
    },
    binarySearch: function(array, value, getter){ // position of value
      return array.binarySearchPos(value, getter, false, true);
    },
 
    // collection for
    add: function(array, value){
      return array.indexOf(value) == -1 && !!array.push(value);
    },
    remove: function(array, value){
      var index = array.indexOf(value);
      return index != -1 && !!array.splice(index, 1);
    },
    has: function(array, value){
      return array.indexOf(value) != -1;
    },
 
    // misc.
    merge: function(array, object){
      return array.reduce(extend, object || {});
    },
    sortAsObject: function(array, getter_, comparator, desc){
      getter_ = getter(getter_);
      desc = desc ? -1 : 1;
 
      return array
        .map(function(item, index){
           return {
             i: index,        // index
             v: getter_(item) // value
           };
         })
        .sort(comparator || function(a, b){           // stability sorting (neccessary only for browsers with no strong sorting, just for sure)
           return desc * ((a.v > b.v) || -(a.v < b.v) || (a.i > b.i ? 1 : -1));
         })
        .map(function(item){
           return this[item.i];
         }, array);
    },
    set: function(array, source){
      if (array !== source)
      {
        array.length = 0;
        array.push.apply(array, source);
      }
      return array;
    },
    clear: function(array){
      array.length = 0;
      return array;
    }
  };

  extendPrototype(Array, arrayExt);

  // IE 5.5+ & Opera
  // when second argument is omited, method set this parameter equal zero (must be equal array length)
  if (![1, 2].splice(1).length)
  {
    Array.prototype.splice = function(){
      var params = arrayFrom(arguments);
      if (params.length < 2)
        params[1] = this.length;
      return arraySplice.apply(this, params);
    };
  }


 /**
  * String extensions
  * @namespace String
  */

  var ESCAPE_FOR_REGEXP = /([\/\\\(\)\[\]\?\{\}\|\*\+\-\.\^\$])/g;
  var FORMAT_REGEXP = /\{([a-z\d_]+)(?::([\.0])(\d+)|:(\?))?\}/gi;
  var STRING_QUOTE_PAIRS = { '<': '>', '[': ']', '(': ')', '{': '}', '\xAB': '\xBB' };
  var QUOTE_REGEXP_CACHE = {};

  function isEmptyString(value){
    return value == null || String(value) == '';
  }

  function isNotEmptyString(value){
    return value != null && String(value) != '';
  }


 /**
  * @namespace String.prototype
  */

  var stringExt = {
    toObject: function(string, rethrow){
      // try { return eval('0,' + string) } catch(e) {}
      // safe solution with no eval:
      try {
        return new Function('return 0,' + string)();
      } catch(e) {
        if (rethrow)
          throw e;
      }
    },
    toArray: ('a'.hasOwnProperty('0')
      ? function(string){
          return arrayFrom(string);
        }
      // IE Array and String are not generics
      : function(string){
          var result = [];
          var len = string.length;
          for (var i = 0; i < len; i++)
            result[i] = string.charAt(i);
          return result;
        }
    ),
    forRegExp: function(string){
      return string.replace(ESCAPE_FOR_REGEXP, "\\$1");
    },
    repeat: function(string, count){
      return (new Array(parseInt(count, 10) + 1 || 0)).join(string);
    },
    qw: function(string){
      var trimmed = string.trim();
      return trimmed ? trimmed.split(/\s+/) : [];
    },
    format: function(string, first){
      var data = arraySlice.call(arguments, 1);

      if (typeof first == 'object')
        extend(data, first);

      return string.replace(FORMAT_REGEXP,
        function(m, key, numFormat, num, noNull){
          var value = key in data ? data[key] : (noNull ? '' : m);
          if (numFormat && !isNaN(value))
          {
            value = Number(value);
            return numFormat == '.'
              ? value.toFixed(num)
              : value.lead(num);
          }
          return value;
        }
      );
    },
    quote: function(string, quoteS, quoteE){
      quoteS = quoteS || '"';
      quoteE = quoteE || STRING_QUOTE_PAIRS[quoteS] || quoteS;
      var rx = (quoteS.length == 1 ? quoteS : '') + (quoteE.length == 1 ? quoteE : '');
      return quoteS + (rx ? string.replace(QUOTE_REGEXP_CACHE[rx] || (QUOTE_REGEXP_CACHE[rx] = new RegExp('[' + rx.forRegExp() + ']', 'g')), "\\$&") : string) + quoteE;
    },
    capitalize: function(string){
      return string.charAt(0).toUpperCase() + string.substr(1).toLowerCase();
    },
    camelize: function(string){
      return string.replace(/-(.)/g, function(m, chr){ return chr.toUpperCase(); });
    },
    dasherize: function(string){
      return string.replace(/[A-Z]/g, function(m){ return '-' + m.toLowerCase(); });
    },
    trimLeft: function(string){
      return string.replace(/^\s+/, '');
    },
    trimRight: function(string){
      return string.replace(/\s+$/, '');
    }    
  };
  var stringExt2 = {
    toLowerCase: function(value){
      return String.prototype.toLowerCase.call(value);
    },
    toUpperCase: function(value){
      return String.prototype.toUpperCase.call(value);
    },
    trim: function(value){
      return String.prototype.trim.call(value);
    },
    trimLeft: stringExt.trimLeft,
    trimRight: stringExt.trimRight
  };

  extendPrototype(String, stringExt);
  complete(String, stringExt2);


  // Fix some methods
  // ----------------
  // IE 5.0+ fix
  // 1. result array without null elements
  // 2. when parenthesis uses, result array with no parenthesis value
  if ('|||'.split(/\|/).length + '|||'.split(/(\|)/).length != 11)
  {
    String.prototype.split = function(pattern, count){
      if (pattern == '' || (pattern && pattern.source == ''))
        return this.toArray();

      var result = [];
      var pos = 0;
      var match;

      if (pattern instanceof RegExp)
      {
        if (!pattern.global)
          pattern = new RegExp(pattern.source, /\/([mi]*)$/.exec(pattern)[1] + 'g');

        while (match = pattern.exec(this))
        {
          match[0] = this.substring(pos, match.index);
          result.push.apply(result, match);
          pos = pattern.lastIndex;
        }
      }
      else
      {
        while ((match = this.indexOf(pattern, pos)) != -1)
        {
          result.push(this.substring(pos, match));
          pos = match + pattern.length;
        }
      }
      result.push(this.substr(pos));
      return result;
    };
  }

  // IE fix
  if ('12'.substr(-1) != '2')
  {
    var nativeStringSubstr = String.prototype.substr;
    String.prototype.substr = function(start, end){
      return nativeStringSubstr.call(this, start < 0 ? Math.max(0, this.length + start) : start, end);
    };
  }


 /**
  * Number extensions
  * @namespace Number.prototype
  */

  var numberExt = {
    fit: function(number, min, max){
      if (!isNaN(min) && number < min)
        return Number(min);
      if (!isNaN(max) && number > max)
        return Number(max);
      return number;
    },
    between: function(number, min, max){
      return !isNaN(number) && number >= min && number <= max;
    },
    quote: function(number, start, end){
      return stringExt.quote(number + '', start, end);
    },
    toHex: function(number){
      return parseInt(number, 10).toString(16).toUpperCase();
    },
    sign: function(number){
      return number < 0 ? -1 : +(number > 0);
    },
    base: function(number, div){
      return !div || isNaN(div) ? 0 : Math.floor(number / div) * div;
    },
    lead: function(number, len, leadChar){
      // convert to string and lead first digits by leadChar
      return (number + '').replace(/\d+/, function(num){
        // substract number length from desired length converting len to Number and indicates how much leadChars we need to add
        // here is no isNaN(len) check, because comparation of NaN and a Number is always false
        return (len -= num.length - 1) > 1 ? new Array(len).join(leadChar || 0) + num : num;
      });
    },
    group: function(number, len, splitter){
      return (number + '').replace(/\d+/, function(num){
        return num.replace(/\d/g, function(m, pos){
          return !pos + (num.length - pos) % (len || 3) ? m : (splitter || ' ') + m;
        });
      });
    },
    format: function(number, prec, gs, prefix, postfix, comma){
      var res = number.toFixed(prec);
      if (gs || comma)
        res = res.replace(/(\d+)(\.?)/, function(m, num, c){
          return (gs ? numberExt.group(num, 3, gs) : num) + (c ? comma || c : '');
        });
      if (prefix)
        res = res.replace(/^-?/, '$&' + (prefix || ''));
      return res + (postfix || '');
    }
  };

  extendPrototype(Number, numberExt);


 /**
  * Date extensions
  * @namespace Date.prototype
  */

  if ((new Date).getYear() < 1900)
  {
    extend(Date.prototype, {
      getYear: function(){
        return this.getFullYear() - 1900;
      },
      setYear: function(year){
        return this.setFullYear(!isNaN(year) && year < 100 ? Number(year) + 1900 : year);
      }
    });
  }


  // ===============================
  // core functions
  //

  // basis.require
  var basisRequire = (function(){
    if (NODE_ENV)
    {
      var requirePath = pathUtils.dirname(module.filename) + '/';
      var moduleProto = module.constructor.prototype;
      return function(path){
        var _compile = moduleProto._compile;
        var namespace = getNamespace(path);

        // patch node.js module._compile
        moduleProto._compile = function(content, filename){
          this.basis = basis;
          content = 
            'var basis = module.basis;\n' +
            'var resource = function(filename){ return basis.require(__dirname + "/" + filename) };\n' +
            content;
          _compile.call(extend(this, namespace), content, filename);
        };

        var exports = require(requirePath + path.replace(/\./g, '/'));
        namespace.exports = exports;
        complete(namespace, exports);

        // restore node.js module._compile
        moduleProto._compile = _compile;

        return exports;
      };
    }
    else
    {
      var nsRootPath = config.path;
      var requested = {};

      return function(namespace, path){
        if (/[^a-z0-9_\.]/i.test(namespace))
          throw 'Namespace `' + namespace + '` contains wrong chars.';

        var filename = namespace.replace(/\./g, '/') + '.js';
        var namespaceRoot = namespace.split('.')[0];

        if (namespaceRoot == namespace)
          nsRootPath[namespaceRoot] = path || nsRootPath[namespace] || (pathUtils.baseURI + '/');

        var requirePath = nsRootPath[namespaceRoot];
        if (!namespaces[namespace])
        {
          if (!/^(https?|chrome-extension):/.test(requirePath))
            throw 'Path `' + namespace + '` (' + requirePath + ') can\'t be resolved';

          if (!requested[namespace])
            requested[namespace] = true;
          else
            throw 'Recursive require for ' + namespace;

          var requestUrl = requirePath + filename;

          var ns = getNamespace(namespace);
          var sourceCode = getResourceContent(requestUrl);
          runScriptInContext(ns, requestUrl, sourceCode);
          complete(ns, ns.exports);
          ;;;ns.filename_ = requestUrl;
          ;;;ns.source_ = sourceCode;
        }
      };
    }
  })();


 /**
  * Attach document ready handlers
  * @function
  * @param {function()} handler 
  * @param {*} thisObject Context for handler
  */
  var domReady = (function(){
    // Matthias Miller/Mark Wubben/Paul Sowden/Dean Edwards/John Resig/Roman Dvornov

    var fired = !document || document.readyState == 'complete';
    var deferredHandler;

    function fireHandlers(){
      if (document.readyState == 'complete')
        if (!fired++)
          while (deferredHandler)
          {
            deferredHandler.callback.call(deferredHandler.context);
            deferredHandler = deferredHandler.next;
          }
    }

    // The DOM ready check for Internet Explorer
    function doScrollCheck() {
      try {
        // If IE is used, use the trick by Diego Perini
        // http://javascript.nwbox.com/IEContentLoaded/
        document.documentElement.doScroll("left");
        fireHandlers();
      } catch(e) {
        setTimeout(doScrollCheck, 1);
      }
    }

    if (!fired)
    {
      if (document.addEventListener)
      {
        // use the real event for browsers that support it (all modern browsers support it)
        document.addEventListener('DOMContentLoaded', fireHandlers, false);

        // A fallback to window.onload, that will always work
        global.addEventListener('load', fireHandlers, false);
      }
      else
      {
        // ensure firing before onload,
        // maybe late but safe also for iframes
        document.attachEvent('onreadystatechange', fireHandlers);

        // A fallback to window.onload, that will always work
        global.attachEvent('onload', fireHandlers);

        // If IE and not a frame
        // continually check to see if the document is ready
        try {
          if (!global.frameElement && document.documentElement.doScroll)
            doScrollCheck();
        } catch(e) {
        }
      }
    }

    // return attach function
    return function(callback, context){
      if (!fired)
      {
        deferredHandler = {
          callback: callback,
          context: context,
          next: deferredHandler
        };
      }
      else
        callback.call(context);
    };
  })();


 /**
  * @namespace basis
  */

 /**
  * Singleton object to destroy registred objects on page unload
  */
  var cleaner = (function(){
    var objects = [];

    function destroy(log){
      ;;;var logDestroy = log && typeof log == 'boolean';
      result.globalDestroy = true;
      result.add = $undef;
      result.remove = $undef;

      var object;
      while (object = objects.pop())
      {
        if (typeof object.destroy == 'function')
        {
          try {
            ;;;if (logDestroy) consoleMethods.log('destroy', String(object.className).quote('['), object);
            object.destroy();
          } catch(e) {
            ;;;consoleMethods.warn(String(object), e);
          }
        }
        else
        {
          for (var prop in object)
            object[prop] = null;
        }
      }
      objects.clear();
    }

    if ('attachEvent' in global)
      global.attachEvent('onunload', destroy);
    else
      if ('addEventListener' in global)
        global.addEventListener('unload', destroy, false);
      else
        return {
          add: $undef,
          remove: $undef
        };

    var result = {
      add: function(object){
        if (object != null)
          objects.push(object);
      },
      remove: function(object){
        objects.remove(object);
      }
    };

    // for debug purposes
    ;;;result.destroy_ = destroy;
    ;;;result.objects_ = objects;

    return result;
  })();


  //
  // export names
  //

  // create and extend basis namespace
  var basis = getNamespace('basis').extend({
    NODE_ENV: NODE_ENV,
    config: config,
    platformFeature: {},

    namespace: getNamespace,
    require: basisRequire,
    resource: getResource,
    asset: function(url){
      return url;
    },

    getter: getter,
    ready: domReady,

    Class: Class,
    Token: Token,

    cleaner: cleaner,
    console: consoleMethods,

    object: {
      extend: extend,
      complete: complete,
      keys: keys,
      values: values,
      slice: slice,
      splice: splice,
      merge: merge,
      iterate: iterate,
      coalesce: coalesce
    },
    fn: {
      // test functions
      $undefined: $undefined,
      $defined: $defined,
      $isNull: $isNull,
      $isNotNull: $isNotNull,
      $isSame: $isSame,
      $isNotSame: $isNotSame,

      // gag functions
      $self: $self,
      $const: $const,
      $false: $false,
      $true: $true,
      $null: $null,
      $undef: $undef,

      // getters and modificators
      getter: getter,
      nullGetter: nullGetter,
      def: def,
      wrapper: wrapper,

      // lazy
      lazyInit: lazyInit,
      lazyInitAndRun: lazyInitAndRun,
      runOnce: runOnce,
      body: functionBody
    },
    array: extend(arrayFrom, merge(arrayExt, {
      from: arrayFrom,
      create: createArray
    })),
    string: merge(stringExt, stringExt2, {
      isEmpty: isEmptyString,
      isNotEmpty: isNotEmptyString
    }),
    number: numberExt
  });

  // add dev namespace, host for special functionality in development environment
  getNamespace('basis.dev').extend(consoleMethods);

  // TODO: rename path->stmElse and add path to exports
  basis.path = pathUtils;


  //
  // basis extenstions
  //

  extend(Object, basis.object);
  extend(Function, basis.fn);
  extend(Array, basis.array);
  extend(String, basis.string);


  //
  // auto load section
  //

  if (config.autoload)
    basisRequire(config.autoload);

})(this);
