import * as THREE from 'three';
import * as setup from './setup';
import settings from './settings';
import { addVectorControls, keepPointInsideTriangle, projectPointOntoPlane } from './utils';

console.debug("index.ts loaded");

// Barycentric Coordinates
const barycentricCoordinates = settings.barycentricCoordiantes.coordinates.clone();

// Container for Settings
const insideTriangle = { value: settings.barycentricCoordiantes.insideTriangle };
const verticesVisible = { value: settings.triangle.sphere.visible };

// Setup
const renderer = setup.createRenderer();
const camera = setup.createCamera();
const scene = setup.createScene();
const axesHelper = setup.createAxesHelper();
const triangleSpheres = setup.createTriangleSpheres(verticesVisible);
const [triangleGeometry, triangleMesh] = setup.createTriangleMesh();
const pointMesh: THREE.Mesh = setup.createPointMesh();
const orbitControls = setup.createOrbitControls(renderer, camera);
const dragControls = setup.createDragControls(renderer, camera, orbitControls, [pointMesh, ...triangleSpheres], onDrag);
const advancedGUI = setup.createAdvancedGUI(
	scene, pointMesh, triangleSpheres, verticesVisible, axesHelper,
	updateTriangleColor, updateVerticesVisibility, onPointMovedGUI, onVertexMoved,
	resetAll, resetCamera, resetAppearance, resetTriangle, resetBarycentricCoordiantes,
);
const [barycentricGUI, barycentricControllers] = setup.createBarycentricGUI();

updateTrianglePosition();
updateTriangleColor();
updatePointPosition();
updateBarycentricControllers();
document.addEventListener("keydown", onKeyDown);
window.addEventListener("resize", onWindowSizeChanged);
scene.add(axesHelper);
scene.add(...triangleSpheres);
scene.add(triangleMesh);
scene.add(pointMesh);

// DRAW
requestAnimationFrame(draw);

function draw(): void {
	requestAnimationFrame(draw);
	renderer.render(scene, camera);
}

// EVENTS
function onKeyDown(event: KeyboardEvent) {
	switch (event.key) {
		case "i":
		case "I":
			insideTriangle.value = !insideTriangle.value;
			onInsideTriangleToggled();
			break;
		case "a":
		case "A":
			axesHelper.visible = !axesHelper.visible;
			break;
		case "v":
		case "V":
			verticesVisible.value = !verticesVisible.value;
			updateVerticesVisibility();
			break;
		case "R":
			resetAll();
			break;
	}
}

function onWindowSizeChanged(): void {
	camera.aspect = window.innerWidth / window.innerHeight;
	renderer.setSize(window.innerWidth, window.innerHeight);
}

function onDrag(event: { object: THREE.Object3D }): void {
	if (event.object == pointMesh) {
		onPointDragged();
	} else {
		onVertexMoved();
	}
}

function onVertexMoved(): void {
	updateTrianglePosition();
	updatePointPosition();
}

function onInsideTriangleToggled(): void {
	if (insideTriangle.value) {
		keepPointInsideTriangle(getTriangle(), pointMesh.position);
	}
	updateBarycentricControllers();
}

function onBarycentricCoordinateChanged(i: number): void {
	// keep the edited value inside the triangle
	if (insideTriangle.value) {
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
	if (insideTriangle.value) {
		const j = [0, 1, 2].findIndex((j) => barycentricCoordinates.getComponent(j) < 0 || barycentricCoordinates.getComponent(j) > 1);
		if (j != -1) {
			keepComponentInside(j);
			const k = [0, 1, 2].find((x) => x != i && x != j)!;
			barycentricCoordinates.setComponent(k, 1 - barycentricCoordinates.getComponent(i) - barycentricCoordinates.getComponent(j));
		}

	}
	updatePointPosition();

	function keepComponentInside(i: number): void {
		const value = barycentricCoordinates.getComponent(i);
		barycentricCoordinates.setComponent(i, Math.max(0, Math.min(1, value)));
	}
}

function onPointDragged(): void {
	const triangle = getTriangle();
	const cameraToPoint = pointMesh.position.clone().sub(camera.position);
	const projected = projectPointOntoPlane(camera.position, cameraToPoint, triangle.a, triangle.getNormal(new THREE.Vector3()));
	if (projected) {
		pointMesh.position.copy(projected);
	} else {
		triangle.getPlane(new THREE.Plane()).projectPoint(pointMesh.position, pointMesh.position)
	}
	if (insideTriangle.value) {
		keepPointInsideTriangle(getTriangle(), pointMesh.position);
	}
	updateBarycentricCoordinates();
}

function onPointMovedGUI(i: number): void {
	const triangle = getTriangle();
	const planeNormal = triangle.getNormal(new THREE.Vector3());
	const planeOrigin = triangle.getMidpoint(new THREE.Vector3());
	const direction = new THREE.Vector3(i == 0 ? 0 : 1, i == 1 ? 0 : 1, i == 2 ? 0 : 1);
	const projected = projectPointOntoPlane(pointMesh.position, direction, planeOrigin, planeNormal)!;
	pointMesh.position.copy(projected);
	if (insideTriangle.value) {
		keepPointInsideTriangle(getTriangle(), pointMesh.position);
	}
	updateBarycentricCoordinates();
}

// RESET FUNCTIONS
function resetAll(): void {
	resetCamera();
	resetAppearance();
	resetTriangle();
	resetBarycentricCoordiantes();
}

function resetAppearance(): void {
	(scene.background as THREE.Color).copy(settings.background.color);
	for (let i = 0; i < 3; i++) {
		triangleSpheres[i].material.color.copy(settings.triangle.colors[i]);
	}
	updateTriangleColor();
	verticesVisible.value = settings.triangle.sphere.visible;
	updateVerticesVisibility();
	axesHelper.visible = settings.apperance.axes;
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
	triangleSpheres[0].position.copy(settings.triangle.position[0]);
	triangleSpheres[1].position.copy(settings.triangle.position[1]);
	triangleSpheres[2].position.copy(settings.triangle.position[2]);
	updateTrianglePosition();
	updatePointPosition();
}

// HELPER FUNCTIONS
function getTriangle(): THREE.Triangle {
	return new THREE.Triangle(...triangleSpheres.map((t) => t.position));
}

function updateTrianglePosition(): void {
	const buffer = new THREE.BufferAttribute(new Float32Array(triangleSpheres.flatMap((v) => [v.position.x, v.position.y, v.position.z])), 3);
	triangleGeometry.setAttribute("position", buffer);
}

function updateTriangleColor(): void {
	const buffer = new THREE.BufferAttribute(new Float32Array(triangleSpheres.flatMap((v) => [v.material.color.r, v.material.color.g, v.material.color.b])), 3);
	triangleGeometry.setAttribute("color", buffer);
}

function updatePointPosition(): void {
	pointMesh.position.set(0, 0, 0);
	pointMesh.position.add(triangleSpheres[0].position.clone().multiplyScalar(barycentricCoordinates.x));
	pointMesh.position.add(triangleSpheres[1].position.clone().multiplyScalar(barycentricCoordinates.y));
	pointMesh.position.add(triangleSpheres[2].position.clone().multiplyScalar(barycentricCoordinates.z));
}

function updateBarycentricCoordinates(): void {
	getTriangle().getBarycoord(pointMesh.position, barycentricCoordinates);
}

function updateVerticesVisibility(): void {
	for (const sphere of triangleSpheres) {
		sphere.visible = verticesVisible.value;
	}
}

function updateBarycentricControllers(): void {
	barycentricControllers.forEach((c) => c.destroy());
	barycentricControllers.splice(0);
	barycentricControllers.push(...addVectorControls(barycentricGUI, barycentricCoordinates, ["Alpha", "Beta", "Gamma"], onBarycentricCoordinateChanged, 3));
	barycentricControllers.push(barycentricGUI.add(insideTriangle, "value").name("Inside Triangle").listen(true).onChange(onInsideTriangleToggled));
	if (insideTriangle.value) {
		for (const controller of barycentricControllers) {
			controller.min(0).max(1);
		}
	}
}
