/**
 *	requireX - Load external images, stylesheets and javascript (AMD)
 *	--
 *
 *	@package			requireX
 *	@version 			0.8.2.2
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
		funcs 	= ['require','define','isLoaded','isPending','waitForFiles'],
		helper	= ['forEach','toArray','unite','extend','getFirstOfType','getType','Class','author','version'],
		author 	= 'swe',
		version	= '0.8.2.2',
		
		/**
		 *	Global Shortcuts
		 */
		doc 	= document,
		styles 	= doc.styleSheets,
		regexp 	= RegExp,
		delay 	= setTimeout,
		intv 	= setInterval,
		clIntv 	= clearInterval,
		slice 	= [].slice,
		
		/**
		 *	Retry amount
		 */
		styleTimeout 	= 1000,
		waitForTimeout 	= 1000,
		
		/**
		 *	Regular Expression pattern
		 */
		patternPrefix	= /^(https?:\/\/)?(?:(www)\.)?(.*)/i,
		patternDomain	= /^([^\/?]+)\/?([^?]*)\??(.*)/i,
		patternDirname	= /^([^?]*)\??(.*)/i,
		patternFile		= /(?:\/|^)(.*?)\/?([^\/]+?)(?:\.([^\.]*))?$/,
		patternCDir		= /^.*\/?\.{1,2}\//i,
		patternExec 	= ['!([#\\-])([^;]+?);','g'],
		
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
		 * 	Zero timeout.
		 * 
		 * 	@param Function func Callback function
		 */
		quickDelay = function(func){
			return delay(func,0);
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
		extend = function() {
			var args = toArray(arguments),
				last = args.length - 1,
				nil = true,
				src = args.shift() || {};
		
			getType(args[last]) == 'boolean' && (nil = args.pop());
			
			return forEach(args,function(index,item){
				getType(item) == 'object' && (this.result = forEach(item,function(prop,child){
					!!(nil || (child != null && child.length)) && item.hasOwnProperty(prop) && (this.result[prop] = child);
				},this.result));
			},src);
		},
		
		/**
		 * 	Get index of the first value of an object as soon the given type is equal to that value.
		 * 
		 * 	@param Object obj Object you want to get searched
		 *	@param String type Type you want to be found
		 * 	@return index of the found value
		 */
		getFirstOfType = function getFirstOfType(obj,type) {
			return forEach(obj,function(index,item){
				if (getType(item) == type)
				{
					this.result = index;
					this.skip = true;
				}
			});
		},
		
		/**
		 * 	Get the type of an object.
		 * 
		 * 	@param Object obj Object you want to know the type of
		 * 	@return type of object
		 */
		getType = function(obj){
			return !!Core && !!Core.typeifier ? Core.typeifier.compile(obj) : typeof obj;
		},
		
		/**
		 * 	This add all known types to an static object.
		 *
		 * 	@package		requireX/extTypes
		 * 	@author			swe <soerenwehmeier@googlemail.com>
		 * 	@version		0.8.2.2
		 */
		extTypes = (new (function(){
			var self = this;
			
			self.add = function(ext,type){
				getType(ext) == 'string' ? (self[ext] = type) : forEach(ext,function(_,item){
					self[item] = type;
				});
				
				return self;
			};
		}))
		.add('js','script')
		.add('css','stylesheet')
		.add(['jpg','jpeg','gif','png'],'image'),
	
		/**
		 * 	Basic class creator.
		 *
		 * 	@package		requireX/Class
		 * 	@author			swe <soerenwehmeier@googlemail.com>
		 * 	@version		0.8.2.2
		 */
		Class = function(){
			return forEach(arguments,function(_,module){
				var create = module.create;

				if (create)
				{
					var old = this.result.prototype.create;
					
					this.result.prototype.create = old ? function(){
						return forEach([create.apply(this,arguments),old.apply(this,arguments)],function(_,item){
							item && (item instanceof Array ? this.result.concat(item) : this.result.push(item));
						},[]);
					} : function(){
						return create.apply(this,arguments);
					};
					
					delete module.create;
				}
				
				if (module.static)
				{
					extend(this.result,module.static);
					delete module.static;
				}
				
				extend(this.result.prototype,module);
			},function(){
				return !!this.create ? this.create.apply(this,arguments) : this;
			});
		},
	
		/**
		 * 	Handling object types.
		 *
		 * 	@package		requireX/Type
		 * 	@author			swe <soerenwehmeier@googlemail.com>
		 * 	@version		0.8.2.2
		 */
		Type = new Class({
			/**
			 * 	Constructor
			 * 
			 * 	@param Object handler Special handler for different object subtypes
			 * 	@return Type
			 */
			create : function(handler){
				this.handler = handler;
			},
			
			/**
			 * 	Compile native object types to their subtype.
			 * 
			 * 	@param Object obj Object you want to know the type of
			 * 	@return Type
			 */
			compile : function(obj){
				var type = typeof obj,
					func = this.handler[type];
					
				return func ? func(obj) : type;
			}
		}),
	
		/**
		 * 	Handle dynamic string with changing parts.
		 *
		 * 	@package		requireX/FlexString
		 * 	@author			swe <soerenwehmeier@googlemail.com>
		 * 	@version		0.8.2.2
		 */
		FlexString = new Class({
			/**
			 * 	Constructor
			 * 
			 * 	@param String string String you want to convert to a FlexString
			 *	@param String/Array delimiter Set the delimiter to split the string
			 * 	@return FlexString
			 */
			create : function(string,delimiter){
				var isArray = getType(delimiter) == 'array',
					current = isArray ? delimiter[0] : delimiter,
					next = isArray ? delimiter.slice(1) : null;
				
				extend(this,{
					stack : forEach((string || '').split(current),function(_,item){
						item.length && this.result.push(!!next && !!next.length ? new FlexString(item,next) : item);
					},[]),
					delimiter : current,
					next : next
				});
			},
			
			/**
			 * 	Convert FlexString to a normal string.
			 * 
			 * 	@return Full string
			 */
			get : function(){
				return forEach(this.stack,function(_,item){
					this.result.push(item instanceof FlexString ? item.get() : item);
				},[]).join(this.delimiter);
			},
			
			/**
			 * 	Add a string in front of the FlexString.
			 * 
			 * 	@param String string String you want to add
			 */
			unshift : function(string){
				this.stack.unshift(!!this.next ? new FlexString(string,this.next) : string);
			},
			
			/**
			 * 	Remove first part of FlexString and return it.
			 * 
			 * 	@return first part
			 */
			shift : function(){
				return this.stack.shift();
			},
			
			/**
			 * 	Add a string on the end of FlexString.
			 * 
			 * 	@param String string String you want to add
			 */
			push : function(string){
				this.stack.push(!!this.next ? new FlexString(string,this.next) : string);
			},
			
			/**
			 * 	Remove last part of FlexString and return it.
			 * 
			 * 	@return last part
			 */
			pop : function(){
				return this.stack.pop();
			},
			
			/**
			 * 	Concat two FlexStrings.
			 * 
			 * 	@param FlexString fstring FlexString you want to concat
			 */
			concat : function(fstring){
				fstring instanceof FlexString && this.stack.concat(fstring.stack);
			},
			
			/**
			 * 	Morph two FlexStrings.
			 * 
			 * 	@param FlexString fstring FlexString you want to morph
			 */
			morph : function(fstring){
				fstring instanceof FlexString && (this.stack = fstring.stack.concat(this.stack));
			}
		}),
		
		/**
		 * 	For better handling of all the file pathes.
		 *
		 * 	@package		requireX/Url
		 * 	@author			swe <soerenwehmeier@googlemail.com>
		 * 	@version		0.8.2.2
		 */
		Url = new Class({
			static : {
				/**
				 * 	All supported files types.
				 */
				types : extTypes
			},
			
			/**
			 * 	Constructor
			 * 
			 * 	@param String url String which get converted to Url Object
			 * 	@return Url
			 */
			create : function(url){
				var self = this,
					parts = url.match(patternPrefix).slice(1),
					stack = extend({ext : 'js'},{
						protocol : parts.shift(),
						prefix : parts.shift()
					});
				
				parts = parts.shift().match(!!stack.protocol || !!stack.prefix ? patternDomain : patternDirname).slice(1);

				extend(stack,{
					uri : new FlexString(parts.pop(),['&','=']),
					path : parts.pop(),
					host : parts.pop()
				});
				
				if (!!stack.path && stack.path.length)
				{
					parts = stack.path.match(patternFile);
					
					extend(stack,{
						ext : parts.pop(),
						file : parts.pop(),
						dir : new FlexString(parts.pop(),['/'])
					});
				}
				
				extend(self.stack = stack,{
					fullext : stack.ext ? Url.types[stack.ext.toLowerCase()] : 'script'
				});
			},
			
			/**
			 * 	Get file source string.
			 * 
			 * 	@return source string
			 */
			src : function(){
				var self = this;
			
				return forEach([
					self.stack.protocol,
					!!self.stack.prefix && (self.stack.prefix + '.'),
					!!self.stack.host	&& (self.stack.host + '/'),
					!!self.stack.dir 	&& !!self.stack.dir.stack.length && (self.stack.dir.get() + '/')
				],function(_,item){
					!!item && (this.result += item);
				},'');
			},
			
			/**
			 * 	Get directory.
			 * 
			 * 	@return directory
			 */
			directory : function(){
				var self = this;
			
				return forEach([
					!!self.stack.dir 	&& !!self.stack.dir.stack.length && (self.stack.dir.get() + '/'),
					self.stack.file,
					!!self.stack.ext && ('.' + self.stack.ext)
				],function(_,item){
					!!item && (this.result += item);
				},'').replace(patternCDir,'');
			},
			
			/**
			 * 	Get filename.
			 * 
			 * 	@return filename
			 */
			file : function(){
				return forEach([
					this.stack.file,
					!!this.stack.ext && ('.' + this.stack.ext)
				],function(_,item){
					!!item && (this.result += item);
				},'');
			},
			
			/**
			 * 	Get URI.
			 * 
			 * 	@return URI
			 */
			uri : function(){
				return !!this.stack.uri && !!this.stack.uri.stack.length && ('?' + this.stack.uri.get());
			},
			
			/**
			 * 	Get full source string.
			 * 
			 * 	@return full string
			 */
			full : function(){
				return forEach([
					this.src(),
					this.file(),
					this.uri()
				],function(_,item){
					!!item && (this.result += item);
				},'');
			},
			
			/**
			 * 	Get file type.
			 * 
			 * 	@return file type
			 */
			type : function(){
				return this.stack.fullext;
			},
			
			/**
			 * 	Morph two Url Objects.
			 * 
			 * 	@param Url url Url object you want to morph.
			 */
			morph : function(url){
				url instanceof Url && this.stack.host == url.stack.host && this.stack.dir.morph(url.stack.dir);
			},
			
			/**
			 * 	Add a timestamp to the current URI
			 */
			refresh : function(){
				this.stack.uri.push('_='+(new Date().getTime()));
			}
		}),
	
		/**
		 * 	Special command functions.
		 *
		 * 	@package		requireX/Exec
		 * 	@author			swe <soerenwehmeier@googlemail.com>
		 * 	@version		0.8.2.2
		 */
		Exec = new Class({
			static : {
				/**
				 * 	Internal unite modifier.
				 * 
				 * 	@param Integer i Internal unite pointer
				 *	@return pointer
				 */
				filter : function(i){
					return '$'+(i+1);
				}
			},
			
			/**
			 * 	Constructor
			 * 
			 * 	@param String string String you want to get analyzed for commands
			 * 	@return Exec
			 */
			create : function(string){
				var scan = RegExp.apply(new RegExp,patternExec);
			
				extend(this,{
					cleared : string.replace(RegExp.apply(new RegExp,patternExec),''),
					collection : forEach(function(){
						return scan.exec(string);
					},function(){
						var cmd = unite(['operator','line'],RegExp,Exec.filter);
						
						(this.result[cmd.operator] || (this.result[cmd.operator] = [])).push(cmd.line);
					},{})
				});
			},
			
			/**
			 * 	Loop through specific command collection.
			 * 
			 * 	@param Object collection Collection you want to loop through
			 *	@param Function callback Callback for each command that got found
			 * 	@return all found objects
			 */
			eachCollection : function(collection,callback){			
				if (collection) 
				{
					return forEach(collection,function(index,item){
						var all = item.split('.'),
							next = all.shift(),
							obj = global[next];
							
						if (!!obj)
						{
							if (!!all.length)
							{
								extend(this.result,forEach(function(){
									return all.shift();
								},function(next){
									!(this.result = this.result[next]) && (this.skip = true);
								},obj));
							}
							else
							{
								this.result[next] = obj;
								this.skip = true;
							}
						}
					},{});
				}
				
				return null;
			},
			
			/**
			 * 	Hook all global variables of a script.
			 * 
			 * 	@return variables found
			 */
			getModuleVariables : function(){
				return this.eachCollection(this.collection['#'],function(item,object){
					var result = {};
					
					result[item] = object;
					
					return result;
				});
			},
			
			/**
			 * 	Automaticly execute all found global functions.
			 * 
			 * 	@return results of all executed functions
			 */
			doAutoExecution : function(){
				return this.eachCollection(this.collection['-'],function(item,object){
					var result = {};
					
					result[item] = getType(object) == 'function' ? object.call(null) : null;
					
					return result;
				});
			}
		}),
	
	
		/**
		 * 	Handle instances.
		 *
		 * 	@package		requireX/Instance
		 * 	@author			swe <soerenwehmeier@googlemail.com>
		 * 	@version		0.8.2.2
		 */
		Instance = new Class({
			static : {
				/**
				 * 	Native get/set.
				 */
				native : {
					/**
					 * 	Set value.
					 * 
					 * 	@param String key Key for value
					 *	@param Object value Value you want to set
					 */
					set : function(key,value){
						this[key] = value;
					},
					
					/**
					 * 	Check if key is set.
					 * 
					 * 	@param String key Key for value
					 */
					is : function(key){
						return !!this[key];
					},
					
					/**
					 * 	Get value.
					 * 
					 * 	@param String key Key for value
					 */
					get : function(key){
						return this.instance.is(key) && this[key];
					},
					
					/**
					 * 	Clear value.
					 * 
					 * 	@param String key Key for value
					 */
					clear : function(key){
						if (this.instance.is(key))
						{
							this.instance.set(key,null);
							delete this[key];
						}
					}
				}
			},
			
			/**
			 * 	Constructor
			 * 
			 * 	@param Object props Data you want to handle
			 *	@return Instance
			 */
			create : function(props){
				var self = this;
				
				self.container = {instance:self};
				props = extend({},Instance.native,props);
				
				forEach(props,function(name,prop){
					if (!self[name])
					{
						getType(prop) == 'function' ? (self[name] = function(){
							return prop.apply(self.container,arguments);
						}) : (self[name] = prop);
					}
				});
			},
			
			/**
			 * 	Change native set/get to root set/get.
			 * 
			 *	@return root set/get
			 */
			toRoot : function(){
				return extend(this,{
					/**
					 * 	Set value.
					 * 
					 * 	@param Url key Key for value
					 *	@param Object value Value you want to set
					 */
					set : function(key,value){
						!this.container[key.type()] && (this.container[key.type()] = new Instance());
						this.container[key.type()].set(key.directory(),value);
					},
					
					/**
					 * 	Check if key is set.
					 * 
					 * 	@param Url key Key for value
					 */
					is : function(key){
						return !!this.container[key.type()] && !!this.container[key.type()].is(key.directory());
					},
					
					/**
					 * 	Get value.
					 * 
					 * 	@param Url key Key for value
					 */
					get : function(key){
						return this.is(key) && this.container[key.type()].get(key.directory());
					},
					
					/**
					 * 	Clear value.
					 * 
					 * 	@param Url key Key for value
					 */
					clear : function(key){
						if (this.is(key))
						{
							this.set(key,null);
							delete this.container[key.type()];
						}
					}
				});
			}
		}),
	
		/**
		 * 	Check if state is given and execute callbacks.
		 *
		 * 	@package		requireX/State
		 * 	@author			swe <soerenwehmeier@googlemail.com>
		 * 	@version		0.8.2.2
		 */
		State = new Class({
			/**
			 * 	Constructor
			 * 
			 * 	@param String type State you want at the end
			 *	@return State
			 */
			create : function(type){
				extend(this,{
					type : type,
					stack : []
				});
			},
			
			/**
			 * 	Add callback.
			 * 
			 * 	@param Function func Callback function
			 */
			add : function(func){
				this.stack.push(func);
			},
			
			/**
			 * 	Compare states.
			 * 
			 * 	@param State t State you want to compare
			 */
			is : function(t){
				return this.type == null || t === this.type;
			},
			
			/**
			 * 	Execute callbacks.
			 * 
			 * 	@param State t State you want to compare
			 *	@param Object args Arguments for callbacks
			 */
			run : function(t,args){
				this.is(t) && forEach(function(){
					return this.result.stack[0];
				},function(){
					this.result.stack.shift().apply(null,args || []);
				},this);
			}
		}),
	
		/**
		 * 	Handle all promises.
		 *
		 * 	@package		requireX/Promise
		 * 	@author			swe <soerenwehmeier@googlemail.com>
		 * 	@version		0.8.2.2
		 */
		Promise = new Class({
			static : {
				/**
				 * 	Wait for multiple Promises.
				 * 
				 * 	@param Promise[] All pending Promises
				 *	@return Promise
				 */
				deferred : function(){
					var dfd = new Promise(),
						stack = [],
						args = arguments,
						eof = args.length,
						push = function(index,result){
							stack[index] = result;

							(stack.length == eof && forEach(stack,function(_,item){
								if (item == null)
								{
									this.result = false;
									this.skip = true;
								}
							},true)) && dfd.complete(true,stack);
						};
					
					forEach(args,function(index,item){
						item instanceof Promise && item.always(function(){
							var length = arguments.length;
						
							push(index,!!length && (length > 1 ? arguments : arguments[0]));
						});
					});
						
					return dfd;
				},
				
				/**
				 * 	Synchronous callback queue.
				 * 
				 * 	@param Array pending All Promises which have to handle
				 *	@param Function callback Callback after Promises are done
				 *	@return Promise
				 */
				queue : function(pending,callback){
					var pointer = 0,
						processing = function(){
							if (!pending[pointer])
							{
								return false;
							}
	
							pending[pointer].always(function(){
								processing(++pointer);
							});
							
							return callback(pointer);
						};
						
					return processing() && Promise.deferred.apply(null,pending);
				}
			},
			
			/**
			 * 	Constructor
			 * 
			 *	@return Promise
			 */
			create : function(){
				var self = this,
					states = [
						new State(true),
						new State(false),
						new State()
					];
				
				extend(self,{
					states : states,
					id : Math.floor(new Date().getTime() * Math.random()),
					
					/**
					 * 	Everything is successful callbacks
					 * 
					 * 	@param Function func Callback function
					 *	@return Promise
					 */
					then : function(func){
						states[0].add(func);
						
						return self;
					},
					
					/**
					 * 	Something failed callbacks
					 * 
					 * 	@param Function func Callback function
					 *	@return Promise
					 */
					fail : function(func){
						states[1].add(func);
						
						return self;
					},
					
					/**
					 * 	Always do callbacks
					 * 
					 * 	@param Function func Callback function
					 *	@return Promise
					 */
					always : function(func){
						states[2].add(func);
						
						return self;
					}
				});
			},
			
			/**
			 * 	Set Promise to done.
			 * 
			 * 	@param Array pending All Promises which have to handle
			 *	@param Function callback Callback after Promises are done
			 *	@return Promise
			 */
			complete : function(state,args){
				forEach(this.states,function(index,item){
					item.run(state,args);
				});
			},

			/**
			 * 	Set next Promise.
			 * 
			 * 	@param Array files Files to load
			 *	@param Object settings Settings for the load (optional)
			 *	@param Function callback Callback after everything is done (optional)
			 *	@param Function process Callback for every file loaded (optional)
			 *	@return Promise
			 */
			next : function(){
				var dfd = new Promise(),
					args = arguments;
					
				this.always(function(){
					require.apply(null,args).then(function(){
						dfd.complete(true,arguments);
					}).fail(function(){
						dfd.complete(false,arguments);
					});
				});
					
				return dfd;
			}
		}),
	
		/**
		 * 	Main class of requireX.
		 *
		 * 	@package		requireX/Core
		 * 	@author			swe <soerenwehmeier@googlemail.com>
		 * 	@version		0.8.2.2
		 */
		Core = new Class({
			static : {
				/**
				 * 	Argument processing helper.
				 *
				 * 	@package		requireX/Core/argsHandler
				 * 	@author			swe <soerenwehmeier@googlemail.com>
				 * 	@version		0.8.2.2
				 */
				argsHandler : new Class({
					static : {
						/**
						 * 	Argument handler for define function.
						 * 
						 * 	@param Object args Argument options
						 *	@return options object
						 */
						define : function(args){
							return forEach({
								settings : 'object',
								requires : 'array',
								create : 'function'
							},function(index,item){
								var first = getFirstOfType(args,item);
								
								if (first != null) 
								{
									this.result[index] = args[first];
									args[first] = null;
									delete args[first];
								}
							},{});
						},
						
						/**
						 * 	Argument handler for waitForFiles function.
						 * 
						 * 	@param Object args Argument options
						 *	@return options object
						 */
						waitForFiles : function(args){
							return getType(args[0]) == 'array' ? args[0] : args;
						},
						
						/**
						 * 	Argument handler for require function.
						 * 
						 * 	@param Object args Argument options
						 *	@return options object
						 */
						require : function(args){
							return forEach({
								files : 'array',
								settings : 'object',
								callback : 'function',
								process : 'function'
							},function(index,item){
								var first = getFirstOfType(args,item);
								
								if (first != null)
								{
									this.result[index] = args[first];
									args[first] = null;
									delete args[first];
								}
							},{});
						}
					}
				}),
				
				/**
				 * 	Core static as GetType helper.
				 */
				typeifier : new Type({
					object : (function(parents){
						var length = parents.length;
							
						return function(object){
							return forEach(parents,function(index,item){
								if (object instanceof global[item])
								{
									this.result = item.toLowerCase();
									this.skip = true;
								}
							}) || 'object';
						};
					})(['Array','Number','Date','RegExp'])
				}),
				
				/**
				 * 	Core static as browser analyzing helper.
				 */
				browser : (function(){
					var obj = {},
						agent = navigator.userAgent,
						app = agent.match(/(opera|chrome|safari|firefox|msie)\/?\s*(\.?\d+(\.\d+)*)/i), ver;

					if (app || (ver = agent.match(/version\/([\.\d]+)/i)))
					{
						obj[app[1]] = true;
						obj.version = ver ? ver[1] : app[2];
						
						return obj;
					}

					obj[navigator.appName] = true;
					obj.version = navigator.appVersion;
					
					return obj;
				})(),
				
				/**
				 * 	Core static as appendTo helper.
				 */
				appendTo : (function(_){
					return _.length ? _[0] : null;
				})(doc.getElementsByTagName('head')),
				
				/**
				 * 	Core instances.
				 */
				cache : (new Instance()).toRoot(),
				pending : (new Instance()).toRoot(),
				defined	: (new Instance()).toRoot(),
				loading : null,
				
				/**
				 * 	Load file helper.
				 *
				 * 	@package		requireX/Core/load
				 * 	@author			swe <soerenwehmeier@googlemail.com>
				 * 	@version		0.8.2.2
				 */
				load : new Class({
					static : {
						/**
						 * 	Load Javascript files.
						 * 
						 * 	@param Context ctx File context
						 *	@return Promise
						 */
						script : function(ctx){
							var dfd = new Promise(),
								script = document.createElement("script"),
								onload = function( _, failure ) {
									if (!script) return;
									
									var state = script.readyState;
								
									if (failure || !state || /loaded|complete/i.test( state ) ) 
									{					
										script.onerror = script.onload = script.onreadystatechange = null;
										!!script.parentNode && script.parentNode.removeChild( script );
										Core.loading = script = null;
										dfd.complete(ctx.success = !failure && !(Core.browser.MSIE && /loaded/.test( state )));
									}
								},
								onerror = function(_){
									onload(_,true);
								};
								
							Core.loading = ctx;
							
							quickDelay(function(){
								extend(script,{
									type : 'text/javascript',
									charset : 'utf-8',
									async : true,
									onload : onload,
									onreadystatechange : onload,
									onerror : onerror,
									src : ctx.path.full()
								},ctx.settings,false);
								
								Core.appendTo.appendChild(script);
							});
							
							return dfd;
						},
						
						/**
						 * 	Load Cascading Style Sheet files. (Internet Explorer got an issue since it wont fire error event.)
						 * 
						 * 	@param Context ctx File context
						 *	@return Promise
						 */
						stylesheet : function(ctx){
							var dfd = new Promise(),
								style = document.createElement('link'),
								onload = function( _, failure){
									if (!style) return;

									var state = style.readyState;
									
									if (failure || !state || /loaded|complete/i.test( state ) ) 
									{
										clIntv(interval);
										style.onload = style.onreadystatechange = null;
										!!failure && !!style.parentNode && style.parentNode.removeChild( style );
										Core.loading = style = null;

										dfd.complete(ctx.success = !failure);
									}
								},
								onerror = function(_){
									onload(_,true);
								},
								trys = 0,
								interval = intv(function(){
									if (trys > styleTimeout) return onerror();
									
									try{!!style.sheet.cssRules && onload();}catch(e){trys++;}
								},10);
							
							Core.loading = ctx;
							
							quickDelay(function(){
								extend(style,{
									type : 'text/css',
									rel : 'stylesheet',
									charset : 'utf-8',
									onload : onload,
									onreadystatechange : onload,
									onerror : onerror,
									href : ctx.path.full()
								},ctx.settings,false);
								
								Core.appendTo.appendChild(style);
							});
							
							return dfd;
						},
						
						/**
						 * 	Load image files.
						 * 
						 * 	@param Context ctx File context
						 *	@return Promise
						 */
						image : function(ctx){
							var dfd = new Promise(),
								image = new Image(),
								onload = function( _, failure){
									if (!image) return;

									var state = image.readyState;
									if (failure || !state || /loaded|complete/i.test( state ) ) 
									{					
										image.onload = image.onerror = image.onabort = null;
										Core.loading = image = null;

										dfd.complete(ctx.success = !failure && !(Core.browser.MSIE && /loaded/.test( state )));
									}
								},
								onerror = function(_){
									onload(_,true);
								};
								
							Core.loading = ctx;
							
							quickDelay(function(){
								extend(image,{
									onload : onload,
									onreadystatechange : onload,
									onerror : onerror,
									onabort : onerror,
									src : ctx.path.full()
								},ctx.settings,false);
							});
							
							return dfd;
						}
					},
					
					/**
					 * 	Constructor
					 * 
					 * 	@param Context ctx File context
					 *	@return Promise
					 */
					create : function(ctx){
						var dfd = new Promise();
						
						quickDelay(function(){
							if (!Core.load[ctx.path.type()])
							{
								return dfd.complete(ctx.success = false,[ctx]);
							}

							Core.load[ctx.path.type()](ctx).then(function(){
								ctx.variables = ctx.exec.getModuleVariables();
								ctx.autoexecution = ctx.exec.doAutoExecution();
							}).always(function(){
								!!ctx.toLoad ? ctx.toLoad.always(function(){
									ctx.toLoad = null;
									delete ctx.toLoad;
									
									dfd.complete(null,[ctx]);
								}) : dfd.complete(null,[ctx]);
							});
						});
						
						return dfd;
					}
				})
			}
		}),
	
		/**
		 * 	Context of loading file.
		 *
		 * 	@package		requireX/Context
		 * 	@author			swe <soerenwehmeier@googlemail.com>
		 * 	@version		0.8.2.2
		 */
		Context = new Class({
			/**
			 * 	Constructor
			 * 
			 * 	@param String file File you want to load
			 *	@param Object settings Settings of the file load
			 *	@return Context
			 */
			create : function(file,settings){
				var self = this,
					exec = new Exec(file);
					
				extend(self,{
					dfd : new Promise(),
					exec : exec,
					path : new Url(exec.cleared),
					settings : settings
				});

				Core.pending.set(self.path,self);
				
				if (!!settings)
				{
					!!settings.refresh && self.path.refresh();
					!!settings.root && self.path.morph(settings.root);
				}
			},
			
			/**
			 * 	Run file load.
			 */
			run : function(){
				var self = this,
					ref = Core.cache.get(self.path);
				
				if (!ref || !ref.success)
				{
					return new Core.load(self).always(function(ctx){
						Core.pending.clear(ctx.path);
						Core.cache.set(ctx.path,ctx);
						ctx.dfd.complete(ctx.success,[ctx]);
					});
				}
				
				quickDelay(function(){
					self.dfd.complete(true,[ref]);
				});
			}
		}),
		
		/**
		 * 	Loading files.
		 *
		 * 	@package		requireX/Loader
		 * 	@author			swe <soerenwehmeier@googlemail.com>
		 * 	@version		0.8.2.2
		 */
		Loader = new Class({
			/**
			 * 	Constructor
			 * 
			 * 	@param Array file Files you want to load
			 *	@param Object settings Settings of the load
			 *	@param Function process Processing callback
			 *	@return Loader
			 */
			create : function(files,settings,process){
				var pending = [],
					self = this;
				
				extend(self,{
					stack : forEach(files,function(_,item){
						if (!item)
						{
							return;
						}
					
						var ctx = new Context(item,settings);
					
						this.result.push(ctx);
						pending.push(ctx.dfd);
					},[]),
					dfd : new Promise()
				});
				
				Promise.queue(pending,function(pointer){
					!!process && process.call(self.stack[pointer],pointer,self.stack[pointer].path);
					self.stack[pointer].run();
					
					return true;
				}).always(function(){
					self.dfd.complete.apply(self.dfd,forEach(arguments,function(_,item){
						!item.success && (this.result[0] = false);
						this.result[1].push(Core.defined.get(item.path) || item);
					},[true,[]]))
				});
			}
		});
		
	/**
	 * 	Load files.
	 * 
	 * 	@param Array files Files to load
	 *	@param Object settings Settings for the load (optional)
	 *	@param Function callback Callback after everything is done (optional)
	 *	@param Function process Callback for every file loaded (optional)
	 *	@return Promise
	 */
	function require(){
		var options = Core.argsHandler.require(arguments),
			loader = new Loader(options.files,options.settings,options.process);
			
		return loader.dfd.always(function(){
			!!Core.master && Core.master.id == loader.dfd.id && (Core.master = null);
			!!options.callback && options.callback.apply(null,arguments);
		});
	}
	
	/**
	 * 	Handle external require calls.
	 * 
	 * 	@param Array files Files to load
	 *	@param Object settings Settings for the load (optional)
	 *	@param Function callback Callback after everything is done (optional)
	 *	@param Function process Callback for every file loaded (optional)
	 *	@return Promise
	 */
	function requirePre(){
		return Core.master = (Core.master ? Core.master.next.apply(Core.master,arguments) : require.apply(null,arguments));
	}
		
	/**
	 * 	Define file context.
	 * 
	 *	@param Function create Create file context
	 * 	@param Array requires Files which are required (optional)
	 *	@param Object settings Settings for the load (optional)
	 */
	function define(){
		if (Core.loading)
		{
			var options = Core.argsHandler.define(arguments);

			if (options.create)
			{			
				if (options.requires)
				{
					var loading = Core.loading,
						loader = new Loader(options.requires,extend({
							root : loading.path
						},options.settings));
					
					return loading.toLoad = loader.dfd.then(function(){
						Core.defined.set(loading.path,options.create.apply(loading,arguments));
					});
				}
				
				Core.defined.set(Core.loading.path,options.create.call(Core.loading));
			}
		}
	}
	
	/**
	 * 	Check if file is pending.
	 * 
	 *	@param String file File to check
	 * 	@return is file pending
	 */
	function isPending(file){
		return Core.pending.is(new Url(file));
	}
	
	/**
	 * 	Check if file is loaded.
	 * 
	 *	@param String file File to check
	 * 	@return is file loaded
	 */
	function isLoaded(file){
		var path = new Url(file);
	
		return Core.cache.is(path) && Core.cache.get(path).success;
	}
		
	/**
	 * 	Check if file is loaded.
	 * 
	 *	@param Array argument Files you want to wait for
	 * 	@return Promise
	 */
	function waitForFiles(){
		var dfd = new Promise(),
			files = Core.argsHandler.waitForFiles(arguments),
			pending = [],
			pathes = forEach(files,function(_,item){
				var path = new Url(item);
				
				if (Core.pending.is(path))
				{
					pending.push(Core.pending.get(path).dfd);
				}
				else if (!Core.cache.is(path))
				{
					var retry = new Promise(),
						trys = 0,
						interval = intv(function(){
							if (++trys > waitForTimeout)
							{
								clIntv(interval);
							}
							else if (Core.pending.is(path))
							{
								Core.pending.get(path).dfd.then(function(){
									retry.complete();
								});
								clIntv(interval);
							}
							else if (Core.cache.is(path))
							{
								retry.complete();
								clIntv(interval);
							}
						},10);

					pending.push(retry);
				}

				this.result.push(path);
			},[]),
			getArgs = function(){
				dfd.complete.apply(dfd,forEach(pathes,function(index,item){
					if (!Core.cache.is(item) || !Core.cache.get(item).success)
					{
						this.result[0] = false;
					}
					
					this.result[1][index] = Core.defined.get(item) || Core.cache.get(item);
				},[true,[]]))
			};
		
		pending.length 
			? Promise.deferred.apply(null,pending).always(getArgs) 
			: delay(getArgs,0);
			
		return dfd;
	}
	
	extend(global,unite(funcs,[requirePre,define,isPending,isLoaded,waitForFiles]));
	extend(global[funcs[0]],unite(helper,[forEach,toArray,unite,extend,getFirstOfType,getType,Class,author,version]));
})(this.window || this);