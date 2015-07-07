(function(CL){

	function EventObject(opt){
		this.target = opt.target;
		this.type = opt.type;
		this.layer = opt.layer;
		this.originEventObject = opt.originEventObject;
	};

	EventObject.prototype = {
		constructor:EventObject,
		stopPropagation:function(){
			this.layer.setStopEventPropagation(this.type);
		}
	}


	CL.EventObject = EventObject;

})(window.CanvasList  = window.CanvasList || {});