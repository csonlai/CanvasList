(function(){
	var List = CanvasList.List;
	var ListItem = CanvasList.ListItem;
	var CanvasImage = CanvasList.CanvasImage;
	var CanvasText = CanvasList.CanvasText;
	var RenderLayer = CanvasList.RenderLayer;

	var canvasElement = $('.canvas-list');

	var isLoading = false;

	//样式类集合
	var classMap = {
		'active':{
			backgroundColor:'blue'
		},
		'list':{
			width:600,
			height:900,
			backgroundColor:'gray'
		},
		'list-item':{
			padding:10,
			opacity:1,
			backgroundColor:'rgb(153, 198, 184)'
		},
		'info':{
			marginLeft:80
		},
		'avatar':{
			// left:10,
			// top:10,
			position:'absolute',
			width:56,
			height:56,
			borderRadius:28			
		},
		'title':{
			fontSize:28,
			lineHeight:28,
			width:280,
			height:40,
			backgroundColor:'green',
			color:'blue'			
		},
		'brief':{
			fontSize:24,
			width:100,
			height:40,
			color:'gray',
			backgroundColor:'red'
		},
		'btn':{
			position:'absolute',
			right:4,
			top:20,
			fontSize:24,
			width:80,
			height:40,
			textAlign:'center',
			lineHeight:40,
			borderRadius:12,
			borderColor:'green'
		},
		'hide':{
			position:'absolute',
			top:-9999999
		},
		'loading':{
			height:60,
			textAlign:'center',
			fontSize:32,
			top:10
		}
	};

	var loadingText;

	var list = new List({
		canvasElement : canvasElement,
		className:'list',
		activeClassName:'active',
		classMap:classMap
	});

	// list.addEventListener('touchstart',function(e){
	// 	e.target.setStyle({
	// 		backgroundColor:'blue'
	// 	});
	// });

	function processData(i,data,pageIndex){

		var listItem = ListItem({
			className:'list-item',
			useCache:true
		});


		listItem.index = i;

		var container = RenderLayer({
			className:'info'
		});

		var btn = CanvasText({
			className:'btn',
			content:'关注'

		});

		btn.addEventListener('click',function(e){
			e.stopPropagation();
			alert('关注');
		});

		container.addChildren([
			CanvasText({
				className:'title',
				content:data.title
			}),
			CanvasText({
				className:'brief',
				content:data.brief
			}),
			btn
		]);

		listItem.addChildren([
			CanvasImage({
				className:'avatar',
				url:data.url
			}),
			container
		]);

	

		list.insertBefore(listItem,loadingText);

	};


	loadingText = CanvasText({
		content:'加载中...',
		className:'loading'
	});

	//加载中
	list.addChildren(loadingText);


	//增加子元素
	$.each(cgiData,function(i,data){
		processData(i,data,0);
	});

	var pageIndex = 0;
	var isEnd = false;


	//滚到到一半触发加载
	list.onScrollToHalf = function(){
		if(isLoading || isEnd) return;

		isLoading = true;

		setTimeout(function(){

			if(pageIndex == 3){
				isEnd = true;
				loadingText.content = '已显示全部内容';
			}


			$.each(cgiData,function(i,data){
				processData(i,data,1);
			});

			pageIndex ++;

			isLoading = false;

		},2000);

	};


	list.run();

	$('.change_size_btn').on('click',function(){
		$(list.children).each(function(i,l){
			l.setStyle({
				'height':400
			});
		});
	});



	
})();