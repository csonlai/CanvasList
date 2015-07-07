(function(CL){
	var CanvasUtil = {
		//设置圆角的绘制上下文
		setBorderRadiusContext:function(ctx,x,y,width,height,borderRadius){
			ctx.beginPath();
			ctx.moveTo(x + borderRadius, y);
			ctx.arcTo(x + width, y, x + width,y + height, borderRadius);
			ctx.arcTo(x + width, y + height, x, y + height, borderRadius);
			ctx.arcTo(x, y + height, x, y, borderRadius);
			ctx.arcTo(x, y, x + width, y, borderRadius);
			ctx.closePath();
		},
		//设置单边边框的绘制上下文
		setSingleBorderContext:function(ctx,x,y,width,height,halfLineWidth,direction){
			var lineWidth = ctx.lineWidth;

			//底部边框
			if(direction == 'bottom'){
				ctx.beginPath();
				ctx.moveTo(x, height - halfLineWidth);
				ctx.lineTo(width, height - halfLineWidth);
				ctx.closePath();
			}
			//左边边框
			if(direction == 'left'){
				ctx.beginPath();
				ctx.moveTo(x + halfLineWidth, y);
				ctx.lineTo(x + halfLineWidth, height);
				ctx.closePath();
			}
			//右边边框
			if(direction == 'right'){
				ctx.beginPath();
				ctx.moveTo(width - halfLineWidth, y);
				ctx.lineTo(width - halfLineWidth, height);
				ctx.closePath();
			}
			//顶部边框
			if(direction == 'top'){
				ctx.beginPath();
				ctx.moveTo(x, y + halfLineWidth);
				ctx.lineTo(x + width,y + halfLineWidth);
				ctx.closePath();
			}
		},
		//获取随机id
		getRandomId:function(){
			return ~~(Math.random() * 1e8);
		},
		//当前层更新时，同时更新子层渲染
		updateSubRenderTree:function(layer){
			//计算样式
			var layoutObj = CanvasUtil.wrapTreeStyle(layer);
			computeLayout.computeLayout(layoutObj);
			//应用样式
			CanvasUtil.applyTreeStyle(layoutObj);	
		},
		//遍历包装计算整个结构树的样式
		wrapTreeStyle:function(layer){
			var style = layer.style;
			var layoutObj = {
				layer:layer,
				layout:{
					width:undefined,
					height:undefined,
					left:0,
					top:0
				},
				style:layer.finalStyle,
				onBeforeComputed:function(){
					layer.beforeLayerLayoutComputed && layer.beforeLayerLayoutComputed(this);

				}
			};

			layoutObj.children = layer.children.map(function(child){
				var obj = CanvasUtil.wrapTreeStyle(child);
				obj.parentLayoutObj = layoutObj.layout;
				return obj;
			});

			//准备计算布局树之前的回调
			layer.beforeComputeLayoutTree && layer.beforeComputeLayoutTree();

			return layoutObj;			
		},
		//把计算的样式值应用到某每个layer
		applyTreeStyle:function(layerObj){
			var layer = layerObj.layer;
			var layout = layerObj.layout;
			//计算样式应用在layer上,left和top为原始属性，所以要增加drawLeft和drawTop用于绘制
			layer.drawLeft = layout.left;
			layer.drawTop = layout.top;
			layer.drawWidth = layout.width;
			layer.drawHeight = layout.height;
			//layer自己实现的额外自定义的layout计算
			layer.customLayoutCalculation && layer.customLayoutCalculation();

			layerObj.children.map(function(child){
				CanvasUtil.applyTreeStyle(child);
			});
		}
	};


	CL.CanvasUtil = CanvasUtil;

})(window.CanvasList  = window.CanvasList || {});