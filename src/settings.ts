import * as THREE from "three";

export default {
	triangle: {
		position: [
			new THREE.Vector3(0, 20, 0),
			new THREE.Vector3(-20, -10, 0),
			new THREE.Vector3(20, -10, 0),
		],
		colors: [
			new THREE.Color("rgb(255, 0, 0)"),
			new THREE.Color("rgb(0, 255, 0)"),
			new THREE.Color("rgb(0, 0, 255)"),
		],
		sphere: {
			radius: 1,
			segments: 32,
			visible: false,
		}
	},
	background: {
		color: new THREE.Color("rgb(64, 64, 64)"),
	},
	camera: {
		position: new THREE.Vector3(0, 0, 50),

	},
	point: {
		radius: 1,
		segments: 32,
		color: 0xFFFFFF,
	},
	barycentricCoordiantes: {
		coordinates: new THREE.Vector3(1 / 3, 1 / 3, 1 / 3),
		insideTriangle: true,
	},
	apperance: {
		axes: false,
	},
	controls: ""
		+ "Left Mouse - Move Camera & Vertices & Point\n"
		+ "I - Toggle Inside Triangle\n"
		+ "V - Toggle Vertices\n"
		+ "A - Toggle Axes\n"
		+ "R - Reset (All)"
};