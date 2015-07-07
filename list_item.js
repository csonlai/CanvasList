(function(CL){

	var RenderLayer = CL.RenderLayer;
	var CanvasImage = CL.CanvasImage;
	var CanvasText = CL.CanvasText;


	function ListItem(opt){
		if(!(this instanceof ListItem)){
			return new ListItem(opt);
		}
		this.init(opt);
	};

	ListItem.prototype = Object.create(RenderLayer.prototype);
	ListItem.prototype.constructor = RenderLayer;


	$.extend(ListItem.prototype,{
		init:function(opt){
			RenderLayer.prototype.init.apply(this,arguments);
		},
		isOutOfView:function(){
			var parent = this.parent;
			return this.drawTop + this.drawHeight < parent.scrollTop || this.drawTop > parent.scrollTop + parent.drawHeight;
		},
		update:function(){
			//不在可视范围内的不update
			if(this.isOutOfView()){
				return;
			} 
			RenderLayer.prototype.update.apply(this,arguments);
		},
		draw:function(){
	
			//不在可视范围内的不绘制
			if(this.isOutOfView()){
				return;
			} 

			RenderLayer.prototype.draw.apply(this,arguments);
		}
	});

	CL.ListItem = ListItem;

})(window.CanvasList  = window.CanvasList || {});