const height = 20;
var edgeColor = "#47a4e3";
var nodesList;
var data = {};
var app;

// 将latex转成svg
function latex2Svg(tex){
	var svg = MathJax.tex2svg(tex);

	var svgWidth = parseFloat(svg.childNodes[0].getAttribute("width").slice(0, -2));
	var svgHeight = parseFloat(svg.childNodes[0].getAttribute("height").slice(0, -2));

	var ratio = svgWidth / svgHeight;

	var svg = svg.childNodes[0]
	var ssvg = new XMLSerializer().serializeToString(svg);
	var base64 = "data:image/svg+xml;base64, " + window.btoa(unescape(encodeURIComponent(ssvg)));
	return {
		base64: base64,
		ratio: ratio
	}
}

// 先生成一级数据，用于编辑和预览节点，再生成二级数据用于绘图
function analyzeData(oriData){
	var equ;
	var idList = [];
	var idNameList = {}; // id与label对应表

	for (var i=0; i<oriData.length; i++){
		idNameList[oriData[i].id] = oriData[i].label;
		idList.push(oriData[i].id);
		oriData[i].from = [];
		oriData[i].toType1 = [];
		oriData[i].toType2 = [];
	}

	for (var i=0; i<oriData.length; i++){

		// 为to添加label
		if (oriData[i].to){
			for (var j=0; j<oriData[i].to.length; j++){
				oriData[i].to[j].label = idNameList[oriData[i].to[j].id];
				if (oriData[i].to[j].type == 1){
					oriData[i].toType1.push(oriData[i].to[j])
				}
				else if(oriData[i].to[j].type == 2){
					oriData[i].toType2.push(oriData[i].to[j])
				}
			}
		}

		// 生成公式svg的base64
		equ = latex2Svg(oriData[i].latex);
		oriData[i].base64 = equ.base64;
		oriData[i].ratio = equ.ratio;
		
		// 计算反向联系
		if(oriData[i].to){
			for(var j=0; j<oriData[i].to.length; j++){
				if(oriData[i].to[j].type == 1){
					var targetId = idList.findIndex((id)=>id==oriData[i].to[j].id);
					oriData[targetId].from.push({id:oriData[i].id, label:oriData[i].label});
				}
				if(oriData[i].to[j].type == 2){
					var targetId = idList.findIndex((id)=>id==oriData[i].to[j].id);
					oriData[targetId].toType2.push({id:oriData[i].id, label:oriData[i].label});
				}
			}
		}
	}
	return oriData;
}


// 处理数据为节点
function createNodeData(oriData) {
	var data = {
		nodes: [],
		edges: []
	}
	for (var i = 0; i < oriData.length; i++) {
		data.nodes.push({
			id: oriData[i].id,
			label: oriData[i].label,
			type: 'image',
			img: oriData[i].base64,
			size: [height * oriData[i].ratio * oriData[i].size, height * oriData[i].size],

		})
		var edge = [];
		if (oriData[i].to){
			for (var j=0; j<oriData[i].to.length; j++){
				data.edges.push({
					source: oriData[i].id,
					target: oriData[i].to[j].id,
					style: {
						stroke: edgeColor,
						endArrow: {
							path: G6.Arrow.triangle(10, 10, 10),
							d: 10,
							fill: edgeColor
						}
					}
				})
			}
		}
		if (oriData[i].to2){
			for (var j=0; j<oriData[i].to2.length; j++){
				data.edges.push({
					source: oriData[i].id,
					target: oriData[i].to2[j],
					style: {
						stroke: edgeColor,
						endArrow: {
							path: G6.Arrow.triangle(10, 10, 10),
							d: 10,
							fill: edgeColor
						},
						startArrow: {
							path: G6.Arrow.triangle(10, 10, 10),
							d: 10,
							fill: edgeColor
						}
					}
				})
			}
		}
	}
	return data;
}


// ---------加载完成----------
window.onload = function () {
	document.getElementById("load").innerText = "Loaded1";
	
	// 创建 G6 图实例
	const graph = new G6.Graph({
		container: 'fig', // 指定图画布的容器 id，与第 9 行的容器对应
		// 画布宽高
		width: 1000,
		height: 800,
		animate: true,
		layout: {
			type: 'gForce',
			prevenOverlap: true,
			linkDistance: 200,
			minMovement: 0.1,
			maxIteration: 1000,
			// gpuEnabled: true
		},
		modes: {
			default: ['drag-canvas', 'zoom-canvas', 'drag-node'], // 允许拖拽画布、放缩画布、拖拽节点
		},
	});
	// 读取数据
	setTimeout(function () {
		$.ajax({
			url: "data.json",
			type: "GET",
			dataType: "json",
			success: function(oriData){
				// 生成一级数据
				var L1Data = analyzeData(oriData);
				console.log(L1Data);
				
				// Vue组件
				var nodeComponent = {
					props:['node'],
					emits:['edit'],
					template:`<div class="nodes" @click="$emit('edit', node.id)">
							<div class="nodesTitle">
								<span class="nodeId">{{node.id}}</span>
								<span class="nodeLabel">{{node.label}}</span>
							</div>
							<div class="nodesEqu">
								<img :src="node.base64">
							</div>
							<div class="nodesLink">
							 	<template v-if="node.toType1.length != 0" >
									<div class="toType1">
										<div></div>
										<span v-for="t in node.toType1">{{t.label}}</span>
									</div>
								</template>
							 	<template v-if="node.toType2.length != 0" >
									<div class="toType2">
										<div></div>
										<span v-for="t in node.toType2">{{t.label}}</span>
									</div>
								</template>
							 	<template v-if="node.from.length != 0" >
									<div class="toTypeFrom">
										<span v-for="t in node.from">{{t.label}}</span>
										<div></div>
									</div>
								</template>
							</div>
						</div>`
				}
				// 创建Vue应用
				nodesList = {
					data(){
						return {
							nodes:L1Data,
							showEdit: false,
							nodeEdit: {
								id: "",
								latex: "",
								label: "",
								size: "",
							}
						}
					},
					methods:{
						nodeedit(e){
							for (var i=0; i<this.nodes.length; i++){
								if (this.nodes[i].id == e){
									this.nodeEdit = this.nodes[i];
									this.nodeEdit.toId = [];
									for (var j=0; j<this.nodes[i].to.length; j++){
										this.nodeEdit.toId.push(this.nodes[i].to[j]);
									}
									this.showEdit = true;
									this.nodeedit.addLink1 = "";
									this.nodeedit.addLink2 = "";
									break;
								}
							}
						}
					}
				}

				app = Vue.createApp(nodesList);
				app.component("node-box",nodeComponent);
				app.mount("#nodesBox");


				var graphData = createNodeData(L1Data);
				graph.data(graphData);
				graph.render();
				// printNodes(oriData);
			},
			error: function(err,sta,emg){
				document.getElementById("load").innerText = emg;
			}
		})
	}, 1000);
}