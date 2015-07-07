(function(CL){

	var CanvasUtil = CL.CanvasUtil;
	var CacheCanvasPool = CL.CacheCanvasPool;
	var devicePixelRatio = window.devicePixelRatio;

	//通用渲染层
	function RenderLayer(opt){
		if(!(this instanceof RenderLayer)){
			return new RenderLayer(opt);
		}
		this.init(opt);
	};

	//布局相关样式列表
	var __layoutStyleList = ['left','top','width','height','minWidth','minHeight','maxWidth','maxHeight'
					   ,'margin','marginLeft','marginRight','marginTop','marginBottom'
					   ,'padding','paddingLeft','paddingRight','paddingTop','paddingBottom'
					   ,'borderWidth','borderLeftWidth','borderRightWidth','borderTopWidth','borderBottomWidth','position'
					   ,'flexDirection','justifyContent','alignItems','alignSelf','flex','flexWrap'];
	//绘制相关样式列表
	var __drawStyleList = ['borderColor','borderStyle','borderRadius','zIndex','backgroundColor','opacity','overflow'];
	//基础样式名集合
	var __styleList = __layoutStyleList.concat(__drawStyleList);



	RenderLayer.prototype = {
		init:function(opt){
			//设置样式值
			var self = this;
			var style = this.style = this.style || {};
			var optStyle = opt.style || {};

			//尺寸
			$.each(__styleList,function(i,styleName){

				var styleValue = optStyle[styleName];

				if(typeof styleValue != 'undefined'){
					style[styleName] = styleValue;
				}
			});


			//最终计算的样式
			this.finalStyle = {};
			this.classStyle = {};
			this.id = opt.id || CanvasUtil.getRandomId();
			this.useCache = opt.useCache;
			this.children = opt.children || [];
			this.parent = opt.parent;
			//首次更新标志
			this.firstUpdate = true;


			this.ctx = opt.ctx;


			//设置样式类
			if(opt.className){
				this.className = opt.className;
			}
			else{
				this.className = '';
			}
		},
		removeCache:function(){
			CacheCanvasPool.remove(this.id);
		},
		//寻找上层的可被缓存的层
		updateParentCacheableLayer:function(){
			var parent = this;
			while(parent){
				if(parent.useCache){
					//删除缓存，方便下次重新绘制
					parent.removeCache();
				}
				parent = parent.parent;
			}
		},

		//某点是否在该元素内
		hitPoint:function(point){
			var position = this.getDrawPositionInCanvas();
			if(point.left >= position.left && point.left <= position.left + this.drawWidth){
				if(point.top >= position.top && point.top <= position.top + this.drawHeight){
					return true;
				} 
			}
			return false;
		},
		//添加事件监听
		addEventListener:function(type,handler){
			if(!this.handlers){
				this.handlers = {};
			}
			if(!this.handlers[type]){
				this.handlers[type] = [];
			}

			this.handlers[type].push(handler);

		},
		//删除事件处理程序
		removeEventListener:function(type,handler){
			if(!type){
				this.handlers = {};
				this.stopPropagationMap = {};
			}
			else if(!handler){
				this.handlers && (this.handlers[type] = []);
				this.stopPropagationMap && (this.stopPropagationMap[type] = null);
			}
			else if(this.handlers && this.handlers[type]){
				this.handlers[type] = this.handlers[type].filter(function(i,h){
					return h !== handler;
				});
			}
		},
		//禁止事件冒泡
		setStopEventPropagation:function(type){
			if(!this.stopPropagationMap){
				this.stopPropagationMap = {};
			}
			this.stopPropagationMap[type] = true;
		},
		//获取是否允许事件冒泡
		getStopEventPropagation:function(type){
			if(this.stopPropagationMap){
				return this.stopPropagationMap[type];
			}
		},
		//增加一个子对象
		addChildren:function(children,index){
			var self = this;
			
			//增加子节点的同时
			var root = this.getRoot();

			if(!$.isArray(children)){
				children = [children];
			}
			//添加父对象引用
			$.each(children,function(i,child){
				child.parent = self;
				//从某个index开始插入元素
				if(index != null){
					self.children.splice(index,0,child);
				}
				if(root){
					//初始化新添加节点的样式
					child.initializeStyle();
				}
			});

			//从最后插入元素
			if(index == null){
				this.children = this.children.concat(children);
			}

			if(root){
	        	root.layoutChanged = true;

	        	//避免root在不适合的时机就initializeStyle
	        	if(!root.firstRun){
		        	root.run();
		        }
	        }


			
		},
		//按zIndex排序prop
		sortChildren:function(){
			
			// this.children = this.children.sort(function(c1,c2){
			// 	return (c1.finalStyle.zIndex || 0) > (c2.finalStyle.zIndex || 0);
			// });
		},
		//是否存在改变layout的样式
		detectLayoutAndStyleValueChanged:function(preStyleObj,styleObj){
			var layoutChanged;
			var styleValueChanged;
			$.each(styleObj,function(name,styleValue){
				//更新和检测style的变更
				if(preStyleObj[name] != styleValue){
					styleValueChanged = true;
					preStyleObj[name] = styleValue;
				}
				//改变的触发layout的属性
				if(__layoutStyleList.indexOf(name) > -1){
					//todo:设置一样的样式值，不重新改变layout
					layoutChanged = true;
				}
			});

			return {
				layoutChanged:layoutChanged,
				styleValueChanged:styleValueChanged
			};
		},
		//设置样式
		setStyle:function(styleObj,needRefreshCache){
			if(needRefreshCache == null){
				needRefreshCache = true;
			}
			//改变的对象检测
			var changedObj = this.detectLayoutAndStyleValueChanged(this.style,styleObj);

			var styleChanged = changedObj.styleValueChanged;
			var layoutChanged = changedObj.layoutChanged;

			if(styleChanged){
				var root = this.getRoot();
				//存在layout更新，让root重新计算layout
				if(root && layoutChanged){
		        	root.layoutChanged = true;
		        }
				//计算最终样式
				this.calculateFinalStyle();

				//更新绘制缓存
				if(needRefreshCache){
					this.updateParentCacheableLayer();
				}
		
		        root.run();
		    }
		},
		//把样式准备好给第一次绘制
		initializeStyle:function(){
			this.applyClassStyle();
			//计算最终样式
			this.calculateFinalStyle();
			//TODO:这里会导致重复计算，后面看看能否优化
			$.each(this.children,function(i,child){
				child.initializeStyle();
			});
		},
		//增加样式类
		addClass:function(className,needRefreshCache){
			var layoutChanged;
			if(needRefreshCache == null){
				needRefreshCache = true;
			}
			
			if(this.className == null) this.className = '';

	        if (!className || this.hasClass(className)){
	            return;
	        }
	        this.className += ' '+ className;

	        var root = this.getRoot();
	        var rootClassMap = root.classMap;

	        if(rootClassMap){
	        	//改变的对象检测
				var changedObj = this.detectLayoutAndStyleValueChanged(this.classStyle,rootClassMap[className]);
		        var classChanged = changedObj.styleValueChanged;
		        var layoutChanged = changedObj.layoutChanged;

		        if(classChanged){
		        	//this.applyClassStyle();
			        //存在layout更新，让root重新计算layout
			        if(layoutChanged){
			        	root.layoutChanged = true;
			        }
			  
			        //计算最终样式
					this.calculateFinalStyle();
					//更新绘制缓存
					if(needRefreshCache){
						this.updateParentCacheableLayer();
					}

					root.run();
			    }
		    }
		},
	
		//删除样式类
		removeClass:function(className,needRefreshCache){
	        if (!className || !this.hasClass(className)) {
	            return;
	        }

	        if(this.className == null) this.className = '';

	        if(needRefreshCache == null){
				needRefreshCache = true;
			}
			
	        this.className = this.className.replace(new RegExp('(?:^|\\s)' + className + '(?:\\s|$)'), ' ');
	        //todo:删除class后样式不变不让classChanged为true
	        this.applyClassStyle();
	      	//计算最终样式
			this.calculateFinalStyle();
			//更新绘制缓存
			if(needRefreshCache){
				this.updateParentCacheableLayer();
			}
			var root = this.getRoot();
			root.run();
		},
		//是否有某个样式类
		hasClass:function(className){
	        if (!className) {
	            return false;
	        }
	        return -1 < (' ' + this.className + ' ').indexOf(' ' + className + ' ');    
		},
		//寻找最近的有指定样式类的层
		closestClass:function(className){
			var parent = this;

			while(parent && !parent.hasClass(className)){
				parent = parent.parent;
			}

			return parent;
		},
		//显示 
		show:function(){

		},
		//隐藏
		hide:function(){

		},
		//获取某个子元素的索引
		getChildIndex:function(child){
			for(var i = 0; i < this.children.length; i ++){
				if(this.children[i] == child){
					return i;
				}
			}
		},
		//插入到某个元素前面
		insertBefore:function(layer,relativeLayer){
			var index = this.getChildIndex(relativeLayer);
			this.addChildren(layer,index);
		},
		//获取相对于canvas的绘制位置
		getDrawPositionInCanvas:function(){
			var parent = this.parent;

			var left = this.drawLeft;
			var top = this.drawTop;
			var scrollTop = 0;

			while(parent){
				left = left + parent.drawLeft;
				top = top + parent.drawTop;

				if(parent.scrollTop){
					scrollTop = parent.scrollTop;
				}
				
				parent = parent.parent;


			}

			return {
				left:left,
				top:top - scrollTop
			};

		},
		getRoot:function(){

			if(this.root) return this.root;

			var root;
			var parent = this.parent;

			while(parent){
				root = parent;
				parent = parent.parent;
			}

			this.root = root;

			return this.root;
		},
		//绘制可被子元素继承的基本属性
		drawInheritable:function(ctx){
			var finalStyle = this.finalStyle;
			var opacity;
			if(finalStyle.opacity && finalStyle.opacity < 1){
				//叠加父元素的透明属性
				if(ctx.globalAlpha){
					opacity = finalStyle.opacity * ctx.globalAlpha;
				}
				ctx.globalAlpha = opacity;
			}

			//方便子元素相对于父元素位置进行绘制
			if(this.drawLeft || this.drawTop){
				ctx.translate(Math.round(this.drawLeft), Math.round(this.drawTop));
			}

		},
		//绘制不可被继承的基本属性
		drawBase:function(ctx){
			// var x = this.x;
			// var y = this.y;
			var finalStyle = this.finalStyle;
			var width = this.drawWidth;
			var height = this.drawHeight;
			var borderRadius = finalStyle.borderRadius;

			//绘制背景颜色
			if (finalStyle.backgroundColor) {
				ctx.fillStyle = finalStyle.backgroundColor;

				//以圆角边框轮廓绘制背景颜色
				if (finalStyle.borderRadius) {
					ctx.fill();
				} 
				//没有圆角边框，绘制矩形背景颜色
				else {
					ctx.fillRect(0, 0, Math.round(width), Math.round(height));
				}
			}
			//圆角轮廓
			if (borderRadius) {

				CanvasUtil.setBorderRadiusContext(ctx,0,0,Math.round(width),Math.round(height),borderRadius);

				//有圆角并且有边框颜色
				if (finalStyle.borderColor) {
					ctx.lineWidth = finalStyle.borderWidth || 1;
					ctx.strokeStyle = finalStyle.borderColor;
					ctx.stroke();
				}

			}
		
			//只有边框颜色，没有边框圆角，则绘制矩形边框
			else if (finalStyle.borderColor) {
				var halfLineWidth;
				ctx.strokeStyle = finalStyle.borderColor;
			
				//完整边框
				if(finalStyle.borderWidth){
					ctx.lineWidth = finalStyle.borderWidth;
					//由于边框以中心为原点scale，所以这里位置要计算一下
					halfLineWidth = ctx.lineWidth / 2;

					ctx.strokeRect(halfLineWidth,halfLineWidth, Math.round(width - ctx.lineWidth), Math.round(height - halfLineWidth));
				}
				else{
					if(finalStyle.borderBottomWidth){
						ctx.lineWidth = finalStyle.borderBottomWidth;
						halfLineWidth = ctx.lineWidth / 2;
						CanvasUtil.setSingleBorderContext(ctx,0,0,Math.round(width),Math.round(height),halfLineWidth,'bottom');
						ctx.stroke();
					}
					if(finalStyle.borderLeftWidth){
						ctx.lineWidth = finalStyle.borderLeftWidth;
						halfLineWidth = ctx.lineWidth / 2;
						CanvasUtil.setSingleBorderContext(ctx,0,0,Math.round(width),Math.round(height),halfLineWidth,'left');
						ctx.stroke();
					}
					if(finalStyle.borderRightWidth){
						ctx.lineWidth = finalStyle.borderRightWidth;
						halfLineWidth = ctx.lineWidth / 2;
						CanvasUtil.setSingleBorderContext(ctx,0,0,Math.round(width),Math.round(height),halfLineWidth,'right');
						ctx.stroke();
					}
					if(finalStyle.borderTopWidth){
						ctx.lineWidth = finalStyle.borderTopWidth;
						halfLineWidth = ctx.lineWidth / 2;
						CanvasUtil.setSingleBorderContext(ctx,0,0,Math.round(width),Math.round(height),halfLineWidth,'top');
						ctx.stroke();
					}	
				}

			}

		},
		//应用类的样式
		applyClassStyle:function(){
			var root = this.getRoot();
			var classNameList = this.className.trim().split(' ');
			var rootClassMap = root.classMap;
			var classStyle = {};

			$.each(classNameList,function(i,className){

				if(rootClassMap[className]){
					$.extend(classStyle,rootClassMap[className]);
				}
			});

			this.classStyle = classStyle;

		},
		//计算最终的样式
		calculateFinalStyle:function(){
			this.finalStyle = $.extend({},this.classStyle,this.style);
		},
		//待子类实现
		draw:function(ctx){

			if(!this.ctx){
				this.ctx = this.getRoot().ctx;
			}

			ctx = ctx || this.ctx;

			var cache;
			var isScrollingDown = CL.isScrollingDown;

			//是否使用缓存canvas绘制
			if(this.useCache){
				cache = CacheCanvasPool.get(this);
		
				if(!cache){
					//新建的缓存canvas
					cache = CacheCanvasPool.add(this,isScrollingDown);
					var cacheCtx = cache.context;
					cacheCtx.save();
					cacheCtx.scale(devicePixelRatio,devicePixelRatio);
					//等下绘制的时候会首先产生该层的偏移，由于缓存canvas需要在原点开始绘制，所以这里预先移位一下
					cacheCtx.translate(-Math.round(this.drawLeft),-Math.round(this.drawTop));
					this.drawDetail(cacheCtx);

					cacheCtx.restore();

					console.log('new cache');
				}


				
				//使用缓存canvas绘制
				ctx.save();
				ctx.translate(Math.round(this.drawLeft),Math.round(this.drawTop));
				ctx.drawImage(cache.canvas[0],0,0,cache.canvas[0].width,cache.canvas[0].height,0,0,Math.round(this.drawWidth),Math.round(this.drawHeight));
				//ctx.drawImage(cache.canvas[0],0,0,1,1,0,0,1,1);
				ctx.restore();
			}
			else{
				this.drawDetail(ctx);
			} 
		},
		//绘制具体内容
		drawDetail:function(ctx){
			ctx.save();

			//绘制可被子元素继承的基本属性，这里设置的属性会被保留到到子元素的ctx
			this.drawInheritable(ctx);

			//绘制不可被继承的基本属性
			ctx.save();
			this.drawBase(ctx);
			ctx.restore();
			//绘制元素自身=独有的基本属性（不可被继承）
			ctx.save();
			this.drawSelf && this.drawSelf(ctx);
			ctx.restore();

			//绘制子元素前出发的事件
			this.onBeforeDrawChildren && this.onBeforeDrawChildren();
			//overflow:hidden;的实现	
			if(this.finalStyle.overflow == 'hidden'){
				ctx.save();
				ctx.rect(0,0,this.drawWidth,this.drawHeight);
				ctx.clip();
				//先绘制自己再绘制子对象
				this.drawChildren(ctx);
				ctx.restore();
			}
			else{
				//先绘制自己再绘制子对象
				this.drawChildren(ctx);
			}

			//绘制子元素前出发的事件
			this.onAfterDrawChildren && this.onAfterDrawChildren();

			ctx.restore();
		
		},
		drawChildren:function(ctx){

			$.each(this.children,function(i,child){
				child.draw(ctx);
			});

		}

	};

	CL.RenderLayer = RenderLayer;

})(window.CanvasList  = window.CanvasList || {});