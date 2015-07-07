(function(CL){

	var RenderLayer = CL.RenderLayer;

	//图片对象
	function CanvasText(opt){
		if(!(this instanceof CanvasText)){
			return new CanvasText(opt);
		}	
		this.init(opt);
	};

	CanvasText.prototype = Object.create(RenderLayer.prototype);
	CanvasText.prototype.constructor = RenderLayer;

	$.extend(CanvasText.prototype,{
		init:function(opt){

			RenderLayer.prototype.init.apply(this,arguments);

			var style = this.style = this.style || {};
			var optStyle = opt.style || {};

			style.color = optStyle.color;
			style.fontSize = optStyle.fontSize;
			style.fontWeight = optStyle.fontWeight;
			style.lineHeight = optStyle.lineHeight;
			style.fontFamily = optStyle.fontFamily;
			style.textAlign = optStyle.textAlign;

			this.content = opt.content + '' || '';

		},
		drawSelf:function(ctx){
	
  			//绘制分行文字
  			this.drawContentWithLines(ctx);

		},
		beforeLayerLayoutComputed:function(layoutObj){
			var parentLayoutObj = layoutObj.parentLayoutObj;
			var parentContentWidth;
			var ctx = this.getRoot().ctx;
			var finalStyle = this.finalStyle;
			var textHeight = finalStyle.lineHeight || 18;

		
			//不设定高度样式，并且有文本内容，使用文本的撑开高度作为绘制高度,父元素的宽度作为计算参考
			if(this.content){
				if(finalStyle.height == null || finalStyle.width == null){ 
					if(this.parent){
						var parentFinalStyle = this.parent.finalStyle;
						//父容器内容宽度
						parentContentWidth = parentLayoutObj.width;
					}
					else{
						parentContentWidth = window.innerWidth;
					}
					parentContentWidth = parentContentWidth- (parentFinalStyle.padding ? parentFinalStyle.padding * 2 : ((parentFinalStyle.paddingLeft || 0) + (parentFinalStyle.paddingRight || 0)))
										   - (finalStyle.padding ? finalStyle.padding * 2 : ((finalStyle.paddingLeft || 0) + (finalStyle.paddingRight || 0)))
										   - (finalStyle.margin ? finalStyle.margin * 2 : ((finalStyle.marginLeft || 0) + (finalStyle.marginRight || 0)))
					
					if(finalStyle.height == null){
			  			//计算文本高度
			  			this.forEachTextLinePosition(ctx,parentContentWidth,function(lineContent,left,top){
			  				textHeight += top;
			  			});

		  				//应用文本高度
		  				layoutObj.style.height  = textHeight + (finalStyle.padding ? finalStyle.padding * 2 : ((finalStyle.paddingTop || 0) + (finalStyle.paddingTop || 0)));			  			
			  		}
			  		if(finalStyle.width == null){

			  			layoutObj.style.width = Math.min(parentContentWidth,ctx.measureText(this.content).width) + 2;

			  		}
		  		}
			}

		},
		//遍历每行字，给出该行字的内容和起点
		forEachTextLinePosition:function(ctx,width,callback){
			var self = this;
  			var testContent = '';
  			var lineHeight = this.finalStyle.lineHeight || 18;
  			var left;
  			var top = 0;
  			var content = this.content;

			var finalStyle = this.finalStyle;

  			ctx.font = (finalStyle.fontWeight || 'normal') + ' ' + (finalStyle.fontSize || 16) + 'px ' + (finalStyle.fontFamily || 'serif');
  			
  			ctx.textBaseline = 'top';
  		
  			$.each(content,function(i,font){
  				var nextFont = content[i + 1] || '';
  				//增加一个文字
  				testContent += font;

  				//满一行，绘制该行文字
  				if(ctx.measureText(testContent + nextFont).width >= width || i == content.length - 1){
  					left = self.getTextStartPosition(testContent,ctx);
  					callback(testContent, Math.round(left), Math.round(top));
  					top += lineHeight;
  					testContent = '';
  				}

  			});
		},
		//分行绘制文字
		drawContentWithLines:function(ctx){
			
			var width = this.drawWidth;
			ctx.fillStyle = this.finalStyle.color || '#000';

  			//绘制每行文字内容
  			this.forEachTextLinePosition(ctx,width,function(lineContent,left,top){
  				ctx.fillText(lineContent, Math.round(left), Math.round(top));
  			});
  			
		},
		//根据textAlign获取文本起始位置
		getTextStartPosition:function(text,ctx){
			var textAlign = this.finalStyle.textAlign || 'left';
			var textWidth = ctx.measureText(text).width;
			var width = this.drawWidth;

			if(textAlign == 'left'){
				return 0;
			}
			if(textAlign == 'right'){
				return width - textWidth;
			}
			if(textAlign == 'center'){
				return (width - textWidth) / 2;
			}
		},
		onClick:function(){

		}
	});

	CL.CanvasText = CanvasText;

})(window.CanvasList  = window.CanvasList || {});