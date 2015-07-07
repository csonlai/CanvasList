(function(CL){

	var RenderLayer = CL.RenderLayer;
	var CanvasUtil = CL.CanvasUtil;

	//图片对象
	function CanvasImage(opt){
		if(!(this instanceof CanvasImage)){
			return new CanvasImage(opt);
		}
		this.init(opt);
	};

	CanvasImage.prototype = Object.create(RenderLayer.prototype);
	CanvasImage.prototype.constructor = CanvasImage;

	$.extend(CanvasImage.prototype,{
		init:function(opt){

			RenderLayer.prototype.init.apply(this,arguments);

			this.url = opt.url;
			//初始化图片对象
			this.imageElement = $('<img>');

			this.bind();

			this.setUrl(this.url);
		},
		bind:function(){
			var self = this;
			this.imageElement.on('load',function(e){
				var element = e.target;
				var finalStyle = self.finalStyle;
				//图片是否已加载
				self.isLoaded = true;

				self.naturalWidth = element.naturalWidth;
				self.naturalHeight = element.naturalHeight;

				if(typeof self.width == 'undefined'){
					finalStyle.width = self.naturalWidth;
				}
				if(typeof self.height == 'undefined'){
					finalStyle.height = self.naturalHeight;
				}
				//删除根元素的缓存canvas，以便更新缓存
				self.updateParentCacheableLayer();
				//初始化样式
				self.initializeStyle();

				//触发缓存canvas更新
				var root = self.getRoot();
				//让根元素重新绘制
				if(root){
					root.run();
				}

					
			});
				
		},
		setUrl:function(url){
			this.url = url;
			this.isLoaded = false;
			this.imageElement.prop('src',url);
		},
		drawSelf:function(ctx){

			//已加载图片才允许绘制
			if(this.isLoaded){

				var width = this.drawWidth;
				var height = this.drawHeight;
				var borderRadius = this.finalStyle.borderRadius;

				//圆角图片裁剪
				if(borderRadius){
					CanvasUtil.setBorderRadiusContext(ctx,0,0,width,height,borderRadius);
					ctx.clip();
				}
				ctx.drawImage(this.imageElement[0],0,0,this.naturalWidth,this.naturalHeight,0,0,Math.round(width),Math.round(height));
				
			}

		},
		onClick:function(){

		}
	});

	CL.CanvasImage = CanvasImage;

})(window.CanvasList  = window.CanvasList || {});