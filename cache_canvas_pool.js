(function(CL){
	var devicPixelRatio = window.devicPixelRatio;
	//缓存的canvas池
	var CacheCanvasPool = {
		init:function(opt){
			opt = opt || {};
			this.poolSize = opt.poolSize || 30;
			this.cacheCanvasList = [];
		},
		get:function(layer){
			var targetCache;
			var id = layer.id;

			$.each(this.cacheCanvasList,function(i,cache){
				if(cache.id == id){
					targetCache = cache;
					return false;
				}
			});

			
			return targetCache;

		},
		add:function(layer,isScrollingDown){

			var cacheCanvasList = this.cacheCanvasList;
			var newCanvas;
			var newCache;
		
			//如果超出了池子大小，拿最旧的来复用
			if(cacheCanvasList.length && (cacheCanvasList.length + 1 > this.poolSize)){
				console.log('reuse!');
				if(window.reused == null){
					window.reused = 0;
				}
				else{
					window.reused++;
					$('.reused-count').html(window.reused);
				}

				var oldCache;
				//根据滚动方向，使用不同的复用缓存方案，避免导致缓存canvas循环使用不当导致的卡顿
				if(isScrollingDown){
					oldCache = cacheCanvasList.shift();
				}
				else{
					oldCache = cacheCanvasList.pop();
				}
				console.log(isScrollingDown);

				newCanvas = oldCache.canvas;
				newCtx = oldCache.context;
				//清空原来内容后再用
				newCtx.clearRect(0,0,newCanvas[0].width,newCanvas[0].height);
			}
			else{
				newCanvas = $('<canvas></canvas>');
				newCtx = newCanvas[0].getContext('2d');
			}
			//缓存canvas和层的大小一致
			newCanvas.prop('width',layer.drawWidth * 2);
			newCanvas.prop('height',layer.drawHeight * 2);

			newCache = {
				id:layer.id,
				canvas:newCanvas,
				context:newCtx
			};	

			if(isScrollingDown){
				//增加到列表并返回
				cacheCanvasList.push(newCache);			
			}
			else{
				//增加到列表并返回
				cacheCanvasList.unshift(newCache);			
			}
		


			//test
			//$('body').append(newCanvas);

			return newCache;

		},
		remove:function(id){
		
			this.cacheCanvasList = this.cacheCanvasList.filter(function(cache){
				//test
				// if(id == cache.id){
				// 	cache.canvas.remove();
				// }
			
				return cache.id != id;
			});



		}
	};

	CL.CacheCanvasPool = CacheCanvasPool;


})(window.CanvasList  = window.CanvasList || {});