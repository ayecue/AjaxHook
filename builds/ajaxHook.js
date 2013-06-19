/**
 *	AjaxHook - Global Ajax hooker
 *	--
 *
 *	@package			AjaxHook
 *	@version 			0.1.0.0
 *	@author 			swe <soerenwehmeier@googlemail.com>
 *
 */
(function(global){
	'use strict';

	var /**
		 *	Variables
		 *	--
		 */

		/**
		 *	General Globals
		 */
		AjaxHook = {},
		funcs = ['XMLHttpRequest','bindAjaxFN','unbindAjaxFN','author','version'],
		toBind = [
			'onreadystatechange',
			'success',
			'failure',
			'complete',
			'opened',
			'headers_received',
			'loading',
			'onabort',
			'onerror',
			'onload',
			'onloadend',
			'onloadstart',
			'onprogress',
			'getResponseHeader',
			'getAllResponseHeaders',
			'send',
			'open',
			'setRequestHeader',
			'overrideMimeType'
		],
		author 	= 'swe',
		version	= '0.1.0.0',
		
		/**
		 *	Global Shortcuts
		 */
		slice 	= [].slice,
		indexOf = [].indexOf,
		
		/**
		 *	Regular Expression pattern
		 */
		capitalizePattern = /(?:^|\s)\S/g,
		
		/**
		 *	Static Functions
		 *	--
		 */

		/**
		 * 	Loops through arrays and objects.
		 * 
		 * 	@param Object/Array obj Current context to go through
		 *	@param Function callback Current char
		 * 	@param Object pre Predefine result value (optional)
		 * 	@return result object
		 */
		forEach = function(obj,callback,pre){
			if (obj == null)
			{
				return null;
			}

			var t, d = {result:pre,skip:false};

			if (typeof obj == 'function')
			{
				while ((t = obj.call(d)) && !d.skip)
				{			
					callback.call(d,t);
				}
			}
			else if (t = obj.length)
			{
				for (var k = 0; k < t && !d.skip; callback.call(d,k,obj[k++]));				
			}
			else
			{
				for (var k in obj)
				{
					typeof obj[k] != 'unknown' && callback.call(d,k, obj[k]);

					if (d.skip)
					{
						break;
					}
				}
			}

			return d.result;
		},
		
		/**
		 * 	Convert objects to an array.
		 * 
		 * 	@param Object obj Object to convert
		 * 	@return converted object
		 */
		toArray = slice ? function(obj){
			return slice.call(obj);
		} : function(obj){
			return forEach(obj,function(index,item){
				this.result.unshift(item);
			},[]);
		},
		
		/**
		 * 	Get index position of object in array.
		 * 
		 * 	@param Object obj Source object you want to search through
		 *	@param Object search Object you want to find
		 * 	@return index position
		 */
		findIndex = indexOf ? function(obj,search){
			return indexOf.call(obj,search);
		} : function(obj,search){							
			return forEach(obj,function(index,item){
				if (item == search){
					this.result = index;
					this.skip = true;
				}
			},-1);
		},
		
		/**
		 * 	Unite two arrays to an object.
		 * 
		 * 	@param Array keys Later object keys
		 *	@param Array values Later object values
		 * 	@param Function get Modify loop pointer (optional)
		 * 	@return united object
		 */
		unite = function(keys,values,get) {
			!!get || (get = function(i){return i;});

			return forEach(keys,function(index,item){
				!!item && (this.result[item] = values[get(index)]);
			},{});
		},
		
		/**
		 * 	Extend multiple objects.
		 * 
		 * 	@param Object[] All objects which you want to unite
		 * 	@return extended object
		 */
		extend = function(){
			var args = toArray(arguments),
				last = args.length - 1,
				nil = true,
				src = args.shift() || {};

			typeof args[last] == 'boolean' && (nil = args.pop());

			return forEach(args,function(index,item){
				typeof item == 'object' && (this.result = forEach(item,function(prop,child){
					!!(nil || (child != null && child.length)) && item.hasOwnProperty(prop) && (this.result[prop] = child);
				},this.result));
			},src);
		},
		
		/**
		 * 	String you want to capitalize.
		 * 
		 * 	@param String string String you want to get capitalized
		 * 	@return capitalized string
		 */
		capitalize = function(string){
			return string.replace(capitalizePattern, function(a) { 
				return a.toUpperCase(); 
			});
		};
	
	
	/**
	 * 	Array wrapper for easier handling with arrays
	 *
	 * 	@package		ajaxHook/ArrayList
	 * 	@author			swe <soerenwehmeier@googlemail.com>
	 * 	@version		0.1.0.0
	 */
	function ArrayList(){
		extend(this,{
			reference : {},
			data : []
		});
	}
	
	extend(ArrayList.prototype,{
		/**
		 * 	Check if a reference exists.
		 * 
		 *	@param String prop Name of the reference
		 *	@return Boolean Got reference?
		 */
		hasReference : function(prop){
			return this.reference[prop] != null && this.hasIndex(this.reference[prop]);
		},
		
		/**
		 * 	Check if a index exists.
		 * 
		 *	@param Number index Index of the data
		 *	@return Boolean Got index?
		 */
		hasIndex : function(index){
			return !!this.data[index];
		},
		
		/**
		 * 	Fast removal of a reference.
		 * 
		 *	@param String prop Name of the reference
		 */
		freeReference : function(prop){
			this.hasReference(prop) && this.data.splice(this.reference[prop],1);
		},
		
		/**
		 * 	Fast removal of a reference.
		 * 
		 *	@param String prop Name of the reference
		 *	@param Object input Whatever you want to add
		 */
		addByReference : function(prop,input){
			this.freeReference(prop);
			this.reference[prop] = this.data.length;
			this.data.push({
				content : input,
				reference : prop
			});
		},
		
		/**
		 * 	Merge a object with this object.
		 * 
		 *	@param Object object Object you want to merge with this
		 */
		mergeWith : function(object){
			var self = this;
			
			forEach(object,function(prop,item){
				self.add(prop,item);
			});
		},
		
		/**
		 * 	Get data by reference.
		 * 
		 *	@param String prop Name of the reference
		 *	@return Object Data you have setted
		 */
		getByReference : function(prop){
			return this.hasReference(prop) && this.data[this.reference[prop]].content;
		},
		
		/**
		 * 	Get index by reference.
		 * 
		 *	@param String prop Name of the reference
		 *	@return Number Index of data
		 */
		getIndexByReference : function(prop){
			return this.hasReference(prop) && this.reference[prop];
		},
		
		/**
		 * 	Remove data by reference.
		 * 
		 *	@param String prop Name of the reference
		 */
		removeByReference : function(prop){
			if (this.hasReference(prop))
			{
				this.data.splice(this.reference[prop],1);
				this.reference[prop] = null;
				delete this.reference[prop];
			}
		},
		
		/**
		 * 	Get data by index.
		 * 
		 *	@param Number index Index of the data
		 *	@return Object Data you have setted
		 */
		getByIndex : function(index){
			return this.hasIndex(index) && this.data[index].content;
		},
		
		/**
		 * 	Get reference by index.
		 * 
		 *	@param Number index Index of the reference
		 *	@return String Reference name
		 */
		getReferenceByIndex : function(index){
			return this.hasIndex(index) && this.data[index].reference;
		},
		
		/**
		 * 	Remove data by index.
		 * 
		 *	@param Number index Index of the reference
		 */
		removeByIndex : function(){
			if (this.hasIndex(index))
			{
				this.reference[this.data[index].reference] = null;
				delete this.reference[this.data[index].reference];
				this.data.splice(index,1);
			}
		},
		
		/**
		 * 	Get size of your data.
		 * 
		 *	@return Number Size of data
		 */
		size : function(){
			return this.data.length;
		}
	});
	
	
	/**
	 * 	Static class to execute global Ajax callbacks
	 *
	 * 	@package		ajaxHook/Executer
	 * 	@author			swe <soerenwehmeier@googlemail.com>
	 * 	@version		0.1.0.0
	 */
	var Executer = new (function(){
		var callbacks = new ArrayList();
		
		extend(this,{
			/**
			 * 	Container for all callbacks
			 */
			callbacks : callbacks,
			
			/**
			 * 	Register callbacks for method.
			 * 
			 *	@param String method Method you want to register
			 *	@param Function callback Function you want to execute if method gets executed
			 */
			register : function(method,callback){
				callbacks.hasReference(method)
					? callbacks.getByReference(method).push(callback)
					: callbacks.addByReference(method,[callback]);
			},
			
			/**
			 * 	Completly unregister a method
			 * 
			 *	@param String method Clear everything in context with this method.
			 */
			unregister : function(method){
				callbacks.removeByReference(method);
			},
			
			/**
			 * 	Execute all registered callbacks of a method.
			 * 
			 *	@param Method method Method of callbacks
			 *	@param Object ctx Context
			 *	@param Array args Original arguments
			 */
			execCallbacks : function(method,ctx,args){
				callbacks.hasReference(method) && forEach(callbacks.getByReference(method),function(_,callback){
					callback.apply(ctx,args);
				});
			},
			
			/**
			 * 	Remove single callback from method.
			 * 
			 *	@param String method Method of callback you want to unregister
			 *	@param Function callback Function you want unregister
			 */
			removeCallback : function(method,callback){
				if (callbacks.hasReference(method))
				{
					var pointer = findIndex(callbacks.getByReference(method));
					
					if (pointer > -1){
						callbacks.getByReference(method).splice(pointer,1);
					}
				}
			}
		});
	})();
	
	
	/**
	 * 	Static function wrapper for the XMLHttpWrapper object
	 *
	 * 	@package		ajaxHook/NativeFNWrapper
	 * 	@author			swe <soerenwehmeier@googlemail.com>
	 * 	@version		0.1.0.0
	 */
	var NativeFNWrapper = new (function(XMLHttp){
		extend(this,{
			/**
			 * 	Create a native XMLHttpRequest object.
			 * 
			 *	@return XMLHttpRequest Create native object
			 */
			allocate : !!XMLHttp ? function(){
				return new XMLHttp();
			} : function(){
				var xmlhttp;
				
				try {
					xmlhttp = new ActiveXObject("Msxml2.XMLHTTP");
				} catch (e) {
					try {
						xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
					} catch (e) {}
				}
				
				return !!xmlhttp ? xmlhttp : false;
			},
			
			/**
			 * 	Execute native XMLHttp functions.
			 * 
			 *	@param Object object Context
			 *	@param String prop Method you want to execute
			 *	@param Array args Original arguments
			 *	@return [*] Whatever the native functions return
			 */
			exec : function(object,prop,args){
				var result;
				
				try{
					//Normal Callback
					result = object[prop].apply(object,args);
				}catch(e){
					//Internet Explorer Fallback
					eval('result = object.'+prop+'('+forEach(args,function(prop,item){
						this.result.push(typeof item == 'string' ? '"' + item + '"' : item);
					},[]).join(',')+');');
				}
				
				//Core Callback
				Executer.execCallbacks(prop,object,args);
				
				return result;
			}
		});
	})(global.XMLHttpRequest);
	
	
	/**
	 * 	Native XMLHttp object wrapper
	 *
	 * 	@package		ajaxHook/XMLHttpWrapper
	 * 	@author			swe <soerenwehmeier@googlemail.com>
	 * 	@version		0.1.0.0
	 */
	function XMLHttpWrapper(){
		var self = this,
		
			/**
			 * 	Internal event executer
			 */
			fnExec = function(method,args){
				Executer.execCallbacks(method,self._nat,args);
				!!self[method] && self[method].apply(self._nat,args);
			};
	
		extend(self,{
			_nat : extend(NativeFNWrapper.allocate(),{
				/**
				 * 	Native onreadystatechange event
				 */
				onreadystatechange : function(){
					if ((self.readyState = self._nat.readyState) == self.DONE)
					{
						forEach([
							'responseText',
							'responseXml',
							'status',
							'statusText'
						],function(_,prop){
							self[prop] = self._nat[prop];
						});
				
						Executer.execCallbacks('complete',self._nat,arguments);
						self.status == 200 
							? Executer.execCallbacks('success',self._nat,arguments)
							: Executer.execCallbacks('failure',self._nat,arguments);
					}
				
					self.readyState == self.OPENED && Executer.execCallbacks('opened',self._nat,arguments);
					self.readyState == self.HEADERS_RECEIVED && Executer.execCallbacks('headers_received',self._nat,arguments);
					self.readyState == self.LOADING && Executer.execCallbacks('loading',self._nat,arguments);
					fnExec('onreadystatechange',arguments);
				},
				
				/**
				 * 	Native onabort event
				 */
				onabort : function(){
					fnExec('onabort',arguments);
				},
				
				/**
				 * 	Native onerror event
				 */
				onerror : function(){
					fnExec('onerror',arguments);
				},
				
				/**
				 * 	Native onload event
				 */
				onload : function(){
					fnExec('onload',arguments);
				},
				
				/**
				 * 	Native onloadend event
				 */
				onloadend : function(){
					fnExec('onloadend',arguments);
				},
				
				/**
				 * 	Native onloadstart event
				 */
				onloadstart : function(){
					fnExec('onloadstart',arguments);
				},
				
				/**
				 * 	Native onprogress event
				 */
				onprogress : function(){
					fnExec('onprogress',arguments);
				}
			}),
			
			/**
			 * 	Native class variables
			 */
			responseText			: "",
			responseXml				: null,
			readyState				: 0,
			status					: 0,
			statusText				: 0,
			withCredentials			: false,
			upload					: null,
			responseType			: null
		});
	}
	
	extend(XMLHttpWrapper.prototype,{
		/**
		 * 	readyState states
		 */
		UNSENT 					: 0,
		OPENED 					: 1,
		HEADERS_RECEIVED 		: 2,
		LOADING 				: 3,
		DONE 					: 4,
		
		/**
		 * 	Wrapper for the native abort function.
		 * 
		 *	@param [*] Like the native ajax function
		 */
		abort : function(){
			return NativeFNWrapper.exec(this._nat,'abort',arguments);
		},
		
		/**
		 * 	Wrapper for the native getResponseHeader function.
		 * 
		 *	@param [*] Like the native ajax function
		 */
		getResponseHeader : function(){
			return NativeFNWrapper.exec(this._nat,'getResponseHeader',arguments);
		},
		
		/**
		 * 	Wrapper for the native getAllResponseHeaders function.
		 * 
		 *	@param [*] Like the native ajax function
		 */
		getAllResponseHeaders : function(){
			return NativeFNWrapper.exec(this._nat,'getAllResponseHeaders',arguments);
		},
		
		/**
		 * 	Wrapper for the native send function.
		 * 
		 *	@param [*] Like the native ajax function
		 */
		send : function(){
			return NativeFNWrapper.exec(this._nat,'send',arguments);
		},
		
		/**
		 * 	Wrapper for the native open function.
		 * 
		 *	@param [*] Like the native ajax function
		 */
		open : function(_,url){
			var self = this;
		
			forEach([
				'withCredentials',
				'upload',
				'responseType'
			],function(_,prop){
				!!self[prop] && (self._nat[prop] = self[prop]);
			});
			self.url = self._nat.url = url;
		
			return NativeFNWrapper.exec(self._nat,'open',arguments);
		},
		
		/**
		 * 	Wrapper for the native setRequestHeader function.
		 * 
		 *	@param [*] Like the native ajax function
		 */
		setRequestHeader : function(){
			return NativeFNWrapper.exec(this._nat,'setRequestHeader',arguments);
		},
		
		/**
		 * 	Wrapper for the native overridMimeType function.
		 * 
		 *	@param [*] Like the native ajax function
		 */
		overrideMimeType : function(){
			return NativeFNWrapper.exec(this._nat,'overrideMimeType',arguments);
		}
	});
	
	/**
	 * 	Bind callback to an Ajax function.
	 * 
	 *	@param String fn Function name you want to bind
	 * 	@param Function callback Callback function
	 */
	function bindAjaxFN(fn,callback){
		Executer.register(fn,callback);
	}
	
	/**
	 * 	Unbind callback from an Ajax function.
	 * 
	 *	@param String fn Function name
	 * 	@param Function callback Callback function you want to unbind
	 */
	function unbindAjaxFN(fn,callback){
		Executer.removeCallback(fn,callback);
	}
	
	/**
	 *	Extend to global object
	 */
	extend(AjaxHook,unite(funcs,[XMLHttpWrapper,bindAjaxFN,unbindAjaxFN,author,version]));
	forEach(toBind,function(_,name){
		var fn = 'bindAjax'+capitalize(name);
	
		AjaxHook[fn] = function(callback){
			bindAjaxFN(name,callback);
		};
		AjaxHook['un'+fn] = function(callback){
			unbindAjaxFN(name,callback);
		};
	});
	extend(global,AjaxHook);
	extend(global.AjaxHook = {},AjaxHook);
})(window || this);