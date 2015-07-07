(function(CL){

	var RenderLayer = CL.RenderLayer;
	var EventObject = CL.EventObject;
	var CacheCanvasPool = CL.CacheCanvasPool;
	var CanvasUtil = CL.CanvasUtil;
	var ListItem = CL.ListItem;

	//默认列表项样式类
	var DEFAULT_ITEM_CLASS = 'canvas-list-item';
	//当前为激活态的列表项
	var currentActiveListItem;
	//当前鼠标/手指位置
	var pageX;
	var pageY;
	var currentTouchList;
	var touchActiveId;
	var devicePixelRatio = window.devicePixelRatio || 1;

	var raf = (function(){
	  return  window.requestAnimationFrame       ||
	          window.webkitRequestAnimationFrame ||
	          window.mozRequestAnimationFrame    ||
	          function( callback ){
	            window.setTimeout(callback, 1000 / 60);
	          };
	})();


	//找出layout变更节点的根节点们
	function getLayoutChangedRoots(layer,rootsArr){

		rootsArr = rootsArr || [];
		//layout发生变化
		if(layer.layoutChanged){//console.log('changed');
			rootsArr.push(layer);
			layer.layoutChanged = false;
		}
		else{
			$.each(layer.children,function(i,child){
				getLayoutChangedRoots(child,rootsArr);
			});
		}

		return rootsArr;
	};

	//滚动处理
	var scrollHandlers = {
		touchstart:function(scroller,e){
			scroller.doTouchStart(e.touches, e.timeStamp);
		},
		touchmove:function(scroller,e){
			scroller.doTouchMove(e.touches, e.timeStamp, e.scale);
		},
		touchend:function(scroller,e){
			scroller.doTouchEnd(e.timeStamp);
			currentTouchList = null;
		},
		touchcancel:function(scroller,e){
			scroller.doTouchEnd(e.timeStamp);
			currentTouchList = null;
		}

	};

	//touch事件处理程序
	function touchHandler(list,e){	

		var rect = list.canvasPosition;
		//滚动处理
		scrollHandlers[e.type] && scrollHandlers[e.type](list.scroller,e);
		//事件处理
		pageX = e.touches ? (e.touches[0] ? e.touches[0].pageX : pageX) : e.pageX;
		pageY = e.touches ? (e.touches[0] ? e.touches[0].pageY : pageY) : e.pageY;

		//点击点对象(高清屏两倍的原因，所以这里计算要乘以2)
		var point = {
			left:(pageX - rect.left),
			top:(pageY - rect.top)
		};
		//需要触发事件监听程序的节点
		//handleNodeEvent(point,list,e);
	};


	//获取某个事件的节点树
	function handleNodeEvent(point,root,originEventObject){
		var node = getEventNode(point,root,type);
		
		//console.log(node);
		var type = originEventObject.type;
		var parent = node;
		var handlersArr;

		while(parent){
			if(parent.handlers &&(handlersArr = parent.handlers[type])){
				$.each(handlersArr,function(i,handler){
					var eve = new EventObject({
						target:node,
						type:type,
						layer:parent,
						originEventObject:originEventObject
					});
					//调用事件处理程序
					handler.call(parent,eve);
				});
			}
			
			//停止冒泡
			if(parent.getStopEventPropagation(type)) return;
			//继续检查上层元素的事件监听
			parent = parent.parent;
		}
	};
	//获取某个事件的最深层节点
	function getEventNode(point,root,type){
		var node;
		var childNode;

		//节点存在事件监听并且击中该点
		if(root.hitPoint(point)){
			node = root;
		}
		//存在子元素
		if(root.children.length){
			$.each(root.children,function(i,child){
				childNode = getEventNode(point,child,type);
				if(childNode){
					node = childNode;
					return false;
				}

			});
			
		}

		return node;
	};

	//canvas列表对象
	var List = function(opt){
		if(!this instanceof List){
			return new List(opt);
		}
		this.init(opt);
	};

	List.prototype = Object.create(RenderLayer.prototype);
	List.prototype.constructor = RenderLayer;


	$.extend(List.prototype,{
		init:function(opt){

			this.classMap = opt.classMap || {};

			RenderLayer.prototype.init.apply(this,arguments);

			this.canvasElement = opt.canvasElement || $('<canvas></canvas>');
			this.avgFPSContainer = opt.avgFPSContainer;
			this.ctx = this.getContext();

			//初始化canvas缓存池
			CacheCanvasPool.init();

			//初始化canvas滚动组件
			this.scroller = new Scroller(this.updateScrollPosition.bind(this),{
				scrollingX: false,
      			scrollingY: true,
      			bouncing: false
			});

			this.firstRun = true;

			//列表项的激活态样式类
			if(opt.activeClassName){
				this.setActiveClass(opt.activeClassName);
			}

			this.bind();

			this.root = this;
		},
		//事件绑定
		bind:function(){
			var self = this;
			var scroller = this.scroller;	

			$(this.canvasElement).on('touchstart',function(e){
				currentTouchList = self;
				touchHandler(currentTouchList,e);
			});	

			$(this.canvasElement).on('click',function(e){
				touchHandler(self,e);
			});

			$(this.canvasElement).on('touchmove',function(e){
				e.preventDefault();
			});	


			if(this.activeClassName){
				//按下态监听
				this.addEventListener('touchstart',function(e){
					var listItem = e.target.closestClass(DEFAULT_ITEM_CLASS);
					currentActiveListItem && currentActiveListItem.removeClass(currentTouchList.activeClassName);
					if(listItem){
						//列表项
						clearTimeout(touchActiveId);
						//按下态
						touchActiveId = setTimeout(function(){
							currentActiveListItem = listItem;
							currentActiveListItem.addClass(self.activeClassName);
						},300);
					}
				});
				//点击态监听
				this.addEventListener('click',function(e){
					var listItem = e.target.closestClass(DEFAULT_ITEM_CLASS);
					
					if(listItem){
						//列表项
						clearTimeout(touchActiveId);

						currentActiveListItem = listItem;
						currentActiveListItem.addClass(self.activeClassName);
						//点击态
						touchActiveId = setTimeout(function(){
							currentActiveListItem.removeClass(self.activeClassName);
							currentActiveListItem = null;
						},300);
					}
				});
			}
		},
		updateCanvasPosition:function(){
			this.canvasPosition = this.canvasElement.offset();
		},
		//列表项的按下态和点击态
		setActiveClass:function(activeClassName){
			this.activeClassName = activeClassName;
		},
		setSize:function(width,height){
			this.style.width = width;
			this.style.height = height;

			this.canvasElement.prop('width',width * devicePixelRatio);
			this.canvasElement.prop('height',height * devicePixelRatio);

			this.canvasElement.css({
				width:width,
				height:height
			});

			this.updateCanvasPosition();
	
		},
		//获取列表项
		getListItems:function(){
			return this.children;
		},
		//获取滚动区域高度
		getScrollHeight:function(){
			var scrollHeight = 0;
			var listItems = this.getListItems();
			$.each(listItems,function(i,item){
				scrollHeight += item.drawHeight;
			});
			return scrollHeight;
		},
		setScrollerSize:function(){
			var finalStyle = this.finalStyle;
			var scrollHeight = this.getScrollHeight();
			this.scroller.setDimensions(finalStyle.width, finalStyle.height, finalStyle.width, scrollHeight);
		},
		//更新滚动位置
		updateScrollPosition:function(left,top){//console.log('scroll');
			this.scrollTop = top;
			this.run(true);
		},

		calculateScrollHalf:function(top){
			
			
			if(!this.preScrollTop){
				this.preScrollTop = this.scrollTop;
			}

			//判断是否往下滚动
			CL.isScrollingDown = this.scrollTop >= this.preScrollTop;
		

			//滚动到一半开始加载下一页内容
			if(CL.isScrollingDown && this.scrollTop + this.drawHeight + 0 >= this.getScrollHeight()){
				this.onScrollToHalf && this.onScrollToHalf(this.scrollTop);
			}	
		
			this.preScrollTop = this.scrollTop;
		},
		addChildren:function(listItem){
			if(listItem instanceof ListItem){
				//list_item的默认class
				listItem.className += ' ' + DEFAULT_ITEM_CLASS;			
			}

			RenderLayer.prototype.addChildren.apply(this,arguments);
		},
		getContext:function(){
			return this.canvasElement[0].getContext('2d');
		},
		clear:function(){
			this.ctx.clearRect(0,0,this.style.width,this.style.height);
		},
		update:function(){
			var self = this;
		
			//todo:仅仅更新脏层的layout树
			//从变化节点中找出根节点，更新layout树
			//var layoutRoots = getLayoutChangedRoots(this);

			//子元素layoutchanged会同步给list元素
			if(this.layoutChanged){//console.log('layout changed');

				this.setSize(this.finalStyle.width,this.finalStyle.height);
				CanvasUtil.updateSubRenderTree(this);
				this.setScrollerSize();

				this.layoutChanged = false;
			}
			
		},
		//计算平均FPS
		calculateAvgFps:function(){
			var now = Date.now();
	
			if(this.sumDuration == null){
				this.sumDuration = 16;
				this.count = 0;
				this.lastUpdateTime = now;
			}
			
			var duration = now - this.lastUpdateTime;

			if(this.sumDuration > 1000){
				this.avgFPS = this.count;
				this.count = 0;
				this.sumDuration = 0;
				if(this.avgFPSContainer){
					//外显平均fps
					this.avgFPSContainer.text('fps:' + this.avgFPS);
				}
			}

			this.sumDuration += duration; 
			this.count ++;

			this.lastUpdateTime = now;
		},
		//下一个循环的行为
		nextTick:function(callback){
			raf(function(){
				callback && callback();
			});
		},
		draw:function(){
		
			var self = this;
			var ctx = this.ctx;

			this.clear();	

			ctx.save();
			ctx.scale(devicePixelRatio,devicePixelRatio);

			RenderLayer.prototype.draw.apply(this,arguments);

			ctx.restore();


		},
		onBeforeDrawChildren:function(){
			this.ctx.save();
			this.ctx.translate(0,-this.scrollTop);
		},
		onAfterDrawChildren:function(){
			this.ctx.restore();
		},
		test:function(){
			var self = this;
			self.calculateAvgFps();
			this.nextTick(function(){
				self.test();
			});
			
		},
		
		run:function(scrolling){

			var self = this;
			if(this.needRun) return;

			this.needRun = true;

			//第一次run
			if(this.firstRun){
				//计算自己和子元素的初始绘制样式
				this.initializeStyle();
				//改变第一次run的标志位
				this.firstRun = false;
			}

			//如果在滚动过程中，计算滚动位置
			if(scrolling){
				this.calculateScrollHalf();
			}

			//下一帧统一draw
			this.nextTick(function(){//console.log('run');

				if(scrolling){
					//计算平均FPS
					self.calculateAvgFps();
				}
				//scrolling过程中不监测layoutchanged
				else{
					self.update();
				}
				

				self.draw();
				self.needRun = false;			
			});

		
		}
	});
	

	



	//统一处理的touch事件
	$(document.body).on('touchmove touchend touchcancel',function(e){
		// if(e.type == 'touchend' || e.type == 'touchcancel'){
		// 	alert(0);
		// }
		clearTimeout(touchActiveId);
		if(currentTouchList){
			currentActiveListItem && currentActiveListItem.removeClass(currentTouchList.activeClassName);
			touchHandler(currentTouchList,e);
		}
	});


	CL.List = List;



})(window.CanvasList  = window.CanvasList || {});