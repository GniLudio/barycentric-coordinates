import * as THREE from 'three';
import * as GUI from 'lil-gui';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DragControls } from 'three/addons/controls/DragControls.js';

import settings from './settings';

console.debug("index.ts loaded");

let renderer: THREE.WebGLRenderer;
let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let axesHelper: THREE.AxesHelper;
let triangleGeometry: THREE.BufferGeometry;
let triangleSpheres: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial, THREE.Object3DEventMap>[];
let triangleMesh: THREE.Mesh;
let barycentricPointMesh: THREE.Mesh;
let cameraControls: OrbitControls;
let dragControls: DragControls;
let barycentricGUI: GUI.GUI;
let advancedGUI: GUI.GUI;
let barycentricControls: GUI.Controller[];

const barycentricCoordinates = settings.barycentricCoordiantes.coordinates.clone();
const withinTriangle = { value: settings.barycentricCoordiantes.withinTriangle };
const spheresVisible = { value: settings.triangle.sphere.visible };

// SETUP
(() => {
	// Renderer
	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);
	window.addEventListener("resize", () => renderer.setSize(window.innerWidth, window.innerHeight));

	document.addEventListener("keydown", (event) => {
		if (event.key == "R" || (event.key == "r" && event.shiftKey)) {
			resetAll();
		}
		else if (event.key == "C" || (event.key == "c" && event.shiftKey)) {
			resetCamera();
		}
		else if (event.key == "T" || (event.key == "t" && event.shiftKey)) {
			resetTriangle();
		}
		else if (event.key == "P" || (event.key == "p" && event.shiftKey)) {
			resetBarycentricCoordiantes();
		}
		else if (event.key == "i" || event.key == "I") {
			withinTriangle.value = !withinTriangle.value;
		}
		else if (event.key == "a" || event.key == "A") {
			axesHelper.visible = !axesHelper.visible;
		}
		else if (event.key == "s" || event.key == "S") {
			spheresVisible.value = !spheresVisible.value;
			updateVertexSpheresVisible();
		}
	});

	// Camera
	camera = new THREE.PerspectiveCamera(undefined, window.innerWidth / window.innerHeight, 0.01, Number.MAX_SAFE_INTEGER);
	window.addEventListener("resize", () => camera.aspect = window.innerWidth / window.innerHeight);
	resetCamera();

	// Scene
	scene = new THREE.Scene();
	scene.background = settings.background.color;
	scene.fog = new THREE.FogExp2(undefined!, settings.background.fogDensity);
	scene.fog.color = settings.background.color;

	// AxesHelper
	axesHelper = new THREE.AxesHelper(Number.MAX_SAFE_INTEGER);
	axesHelper.visible = settings.apperance.axes;
	scene.add(axesHelper);

	// Triangle
	triangleSpheres = settings.triangle.vertices.map((pos, i) => {
		const mesh = new THREE.Mesh(
			new THREE.SphereGeometry(settings.triangle.sphere.radius, settings.triangle.sphere.segments, settings.triangle.sphere.segments),
			new THREE.MeshBasicMaterial({ color: settings.triangle.colors[i] }),
		);
		mesh.visible = spheresVisible.value;
		mesh.position.copy(pos);
		scene.add(mesh);
		return mesh;
	});
	triangleGeometry = new THREE.BufferGeometry();
	triangleMesh = new THREE.Mesh(
		triangleGeometry,
		new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, vertexColors: true }),
	);
	scene.add(triangleMesh);
	updateTrianglePosition();
	updateTriangleColor();

	// Point
	barycentricPointMesh = new THREE.Mesh(
		new THREE.SphereGeometry(settings.point.radius, settings.point.segments, settings.point.segments),
		new THREE.MeshBasicMaterial({ color: settings.point.color }),
	);
	updatePointPosition();
	scene.add(barycentricPointMesh);

	// Camera & Drag Controls
	cameraControls = new OrbitControls(camera, renderer.domElement);
	cameraControls.enablePan = false;
	dragControls = new DragControls([barycentricPointMesh, ...triangleSpheres], camera, renderer.domElement);
	dragControls.addEventListener("dragstart", () => cameraControls.enabled = false);
	dragControls.addEventListener("drag", (event) => {
		if (event.object == barycentricPointMesh) {
			const triangle = getTriangle();
			const cameraToPoint = barycentricPointMesh.position.clone().sub(camera.position);
			const projected = projectPointOntoPlane(camera.position, cameraToPoint, triangle.a, triangle.getNormal(new THREE.Vector3()));
			if (projected) {
				barycentricPointMesh.position.copy(projected);
			} else {
				triangle.closestPointToPoint(barycentricPointMesh.position, barycentricPointMesh.position);
			}
			if (withinTriangle.value) {
				keepPointInsideTriangle(getTriangle(), barycentricPointMesh.position);
			}
			updateBarycentricCoordinates();
		} else {
			updateTrianglePosition();
			updatePointPosition();
		}
	});
	dragControls.addEventListener("dragend", () => cameraControls.enabled = true);
	// Barycentric GUI
	barycentricGUI = new GUI.GUI({ autoPlace: false, container: document.body });
	barycentricGUI.domElement.id = "barycentric-gui";
	createBarycentricControls();
	// Advanced GUI
	advancedGUI = new GUI.GUI().close();
	advancedGUI.domElement.id = "advanced-gui";

	const appearanceFolder = advancedGUI.addFolder("Appearance");
	appearanceFolder.addColor(scene, "background").name("Background");
	appearanceFolder.addColor(barycentricPointMesh.material, "color").name("Point");
	triangleSpheres.forEach((vertex, i) => {
		appearanceFolder.addColor(vertex.material, "color").name(`Vertex ${["A", "B", "C"][i]}`).onChange(updateTriangleColor);
	});
	appearanceFolder.add(spheresVisible, "value").name("Vertices").listen(true).onChange(updateVertexSpheresVisible);
	appearanceFolder.add(axesHelper, "visible").name("Axes").listen(true);

	const pointFolder = advancedGUI.addFolder("Point");
	addVectorControls(pointFolder, barycentricPointMesh.position, ["X", "Y", "Z"], (i: number) => {
		// TODO: What is the best way to move alongside an axis?
		const triangle = getTriangle();
		const plane_normal = triangle.getNormal(new THREE.Vector3());
		const plane_origin = triangle.getMidpoint(new THREE.Vector3());
		const direction = plane_normal.clone().setComponent(i, 0);
		if (direction.length() < 1e-6) direction.copy(plane_normal);
		const projected = projectPointOntoPlane(barycentricPointMesh.position, direction, plane_origin, plane_normal)!;
		barycentricPointMesh.position.copy(projected);
		if (withinTriangle.value) {
			keepPointInsideTriangle(getTriangle(), barycentricPointMesh.position);
		}
		updateBarycentricCoordinates();
	});
	triangleSpheres.forEach((vertex, i) => {
		const folder = advancedGUI.addFolder(`Vertex ${["A", "B", "C"][i]}`);
		addVectorControls(folder, vertex.position, ["X", "Y", "Z"], () => {
			updateTrianglePosition();
			updatePointPosition();
		});
	});
	const resetFolder = advancedGUI.addFolder("");
	resetFolder.add({ "Show Manual": () => window.alert(settings.manual) }, "Show Manual");
	resetFolder.add({ "Reset All": resetAll }, "Reset All");
	resetFolder.add({ "Reset Camera": resetCamera }, "Reset Camera");
	resetFolder.add({ "Reset Triangle": resetTriangle }, "Reset Triangle");
	resetFolder.add({ "Reset Point": resetBarycentricCoordiantes }, "Reset Point");

	requestAnimationFrame(draw);
})();

function draw(): void {
	requestAnimationFrame(draw);
	renderer.render(scene, camera);
}

// UPDATE FUNCTIONS
function updateTrianglePosition(): void {
	triangleGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(triangleSpheres.flatMap((v) => [v.position.x, v.position.y, v.position.z])), 3));
}

function updateTriangleColor(): void {
	triangleGeometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(triangleSpheres.flatMap((v) => [v.material.color.r, v.material.color.g, v.material.color.b])), 3));
}

function updatePointPosition(): void {
	barycentricPointMesh.position.set(
		triangleSpheres[0].position.x * barycentricCoordinates.x + triangleSpheres[1].position.x * barycentricCoordinates.y + triangleSpheres[2].position.x * barycentricCoordinates.z,
		triangleSpheres[0].position.y * barycentricCoordinates.x + triangleSpheres[1].position.y * barycentricCoordinates.y + triangleSpheres[2].position.y * barycentricCoordinates.z,
		triangleSpheres[0].position.z * barycentricCoordinates.x + triangleSpheres[1].position.z * barycentricCoordinates.y + triangleSpheres[2].position.z * barycentricCoordinates.z,
	);
}

function updateBarycentricCoordinates(): void {
	getTriangle().getBarycoord(barycentricPointMesh.position, barycentricCoordinates);
}

function updateVertexSpheresVisible(): void {
	for (const sphere of triangleSpheres) {
		sphere.visible = spheresVisible.value;
	}
}

// RESET FUNCTIONS
function resetAll(): void {
	resetCamera();
	resetBarycentricCoordiantes();
	resetTriangle();
}
function resetCamera(): void {
	camera.position.copy(settings.camera.position);
	camera.lookAt(new THREE.Vector3());
	camera.updateProjectionMatrix();
}

function resetBarycentricCoordiantes(): void {
	barycentricCoordinates.copy(settings.barycentricCoordiantes.coordinates);
	updatePointPosition();
}

function resetTriangle(): void {
	triangleSpheres[0].position.copy(settings.triangle.vertices[0]);
	triangleSpheres[1].position.copy(settings.triangle.vertices[1]);
	triangleSpheres[2].position.copy(settings.triangle.vertices[2]);
	updateTrianglePosition();
	updatePointPosition();
}

// HELPER FUNCTIONS
function getTriangle(): THREE.Triangle {
	return new THREE.Triangle(...triangleSpheres.map((t) => t.position));
}

function createBarycentricControls() {
	barycentricControls?.forEach((c) => c.destroy());
	barycentricControls = [];
	barycentricControls.push(
		...addVectorControls(barycentricGUI, barycentricCoordinates, ["Alpha", "Beta", "Gamma"], onChange, 3)
	);
	barycentricControls.push(
		barycentricGUI.add(withinTriangle, "value").name("Within Triangle").listen(true).onChange(() => {
			createBarycentricControls();
			keepPointInsideTriangle(getTriangle(), barycentricPointMesh.position);
		})
	);
	if (withinTriangle.value) {
		barycentricControls.forEach((c) => c.min(0).max(1));
	}

	function onChange(i: number): void {
		// keep the edited value inside the triangle
		if (withinTriangle.value) {
			keepComponentInside(i);
		}
		// shift the two unedited components
		const shift = (1 - (barycentricCoordinates.x + barycentricCoordinates.y + barycentricCoordinates.z)) / 2;
		for (let j = 0; j < 3; j++) {
			if (j != i) {
				barycentricCoordinates.setComponent(j, barycentricCoordinates.getComponent(j) + shift);
			}
		}
		// keep the two unedited components inside the triangle
		if (withinTriangle.value) {
			const j = [0, 1, 2].findIndex((j) => barycentricCoordinates.getComponent(j) < 0 || barycentricCoordinates.getComponent(j) > 1);
			if (j != -1) {
				keepComponentInside(j);
				const k = [0, 1, 2].find((x) => x != i && x != j)!;
				barycentricCoordinates.setComponent(k, 1 - barycentricCoordinates.getComponent(i) - barycentricCoordinates.getComponent(j));
			}

		}
		updatePointPosition();

		function keepComponentInside(index: number): void {
			const value = barycentricCoordinates.getComponent(index);
			barycentricCoordinates.setComponent(index, Math.max(0, Math.min(1, value)));
		}
	}
}

function projectPointOntoPlane(lineOrigin: THREE.Vector3, lineDirection: THREE.Vector3, planeOrigin: THREE.Vector3, planeNormal: THREE.Vector3, epsilon: number = 1e-6): THREE.Vector3 | undefined {
	const dot = planeNormal.dot(lineDirection);
	if (Math.abs(dot) > epsilon) {
		return lineOrigin.clone().add(lineDirection.multiplyScalar(-planeNormal.dot(lineOrigin.clone().sub(planeOrigin)) / dot));
	}
	return undefined;
}

function addVectorControls(folder: GUI.GUI, obj: THREE.Vector3, names: string[], onChange?: (i: number) => void, decimals: number = 3): GUI.Controller[] {
	return ["x", "y", "z"].map((e, i) => {
		const controller = folder.add(obj, e).name(names[i]).decimals(decimals).listen(true);
		if (onChange) controller.onChange(() => onChange(i));
		return controller;
	});
}

function keepPointInsideTriangle(triangle: THREE.Triangle, position: THREE.Vector3): void {
	triangle.closestPointToPoint(position, position);
}