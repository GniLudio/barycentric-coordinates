import * as THREE from "three";

export default {
	triangle: {
		vertices: [
			new THREE.Vector3(30, 0, 0),
			new THREE.Vector3(0, 30, 0),
			new THREE.Vector3(0, 0, 30),
		],
		colors: [
			new THREE.Color("rgb(255, 0, 0)"),
			new THREE.Color("rgb(0, 255, 0)"),
			new THREE.Color("rgb(0, 0, 255)"),
		],
		sphere: {
			radius: 0.4,
			segments: 32,
			visible: true,
		}
	},
	background: {
		color: new THREE.Color("rgb(64, 64, 64)"),
		fogDensity: 0.001,
	},
	camera: {
		position: new THREE.Vector3(50, 50, 50),
	},
	point: {
		radius: 0.5,
		segments: 32,
		color: 0xFFFFFF,
	},
	barycentricCoordiantes: {
		coordinates: new THREE.Vector3(1 / 3, 1 / 3, 1 / 3),
		withinTriangle: true,
	},
	apperance: {
		axes: true,
	},
	manual: ""
		+ "Left Mouse - Move Camera & Vertices & Point\n"
		+ "Shift + R - Reset All\n"
		+ "Shift + C - Reset Camera\n"
		+ "Shift + T - Reset Triangle\n"
		+ "Shift + P - Reset Point\n"
		+ "\n"
		+ "I - Toggle 'Within Triangle'\n"
		+ "S - Toggle 'Vertices'\n"
		+ "A - Toggle 'Axes'\n"
		+ "\n"
};