import * as THREE from 'three';
import * as GUI from 'lil-gui';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DragControls } from 'three/addons/controls/DragControls.js';

import settings from './settings';
import { addVectorControls } from './utils';

export function createRenderer() {
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    return renderer;
}

export function createCamera() {
    const camera = new THREE.PerspectiveCamera(undefined, window.innerWidth / window.innerHeight, 0.01, Number.MAX_SAFE_INTEGER);
    camera.position.copy(settings.camera.position);
    camera.lookAt(new THREE.Triangle(...settings.triangle.position).getMidpoint(new THREE.Vector3()));
    camera.updateProjectionMatrix();
    return camera;
}

export function createScene() {
    const scene = new THREE.Scene();
    scene.background = settings.background.color.clone();
    return scene;
}

export function createAxesHelper() {
    const helper = new THREE.AxesHelper(Number.MAX_SAFE_INTEGER);
    helper.visible = settings.apperance.axes;
    return helper;
}

export function createTriangleSpheres(spheresVisible: { value: boolean }) {
    return [0, 1, 2].map((i) => {
        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(settings.triangle.sphere.radius, settings.triangle.sphere.segments, settings.triangle.sphere.segments),
            new THREE.MeshBasicMaterial({ color: settings.triangle.colors[i] }),
        );
        mesh.visible = spheresVisible.value;
        mesh.position.copy(settings.triangle.position[i]);
        return mesh;
    });
}

export function createTriangleMesh(): [THREE.BufferGeometry, THREE.Mesh] {
    const geometry = new THREE.BufferGeometry();
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, vertexColors: true }));
    return [geometry, mesh];
}

export function createPointMesh() {
    return new THREE.Mesh(
        new THREE.SphereGeometry(settings.point.radius, settings.point.segments, settings.point.segments),
        new THREE.MeshBasicMaterial({ color: settings.point.color })
    );
}

export function createOrbitControls(renderer: THREE.Renderer, camera: THREE.Camera) {
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    return controls;
}

export function createDragControls(renderer: THREE.Renderer, camera: THREE.Camera, orbitControls: OrbitControls, meshes: THREE.Mesh[], onDrag: (event: { object: THREE.Object3D }) => void) {
    const controls = new DragControls(meshes, camera, renderer.domElement);
    controls.addEventListener("dragstart", () => orbitControls.enabled = false);
    controls.addEventListener("drag", onDrag);
    controls.addEventListener("dragend", () => orbitControls.enabled = true);
}

export function createBarycentricGUI(): [GUI.GUI, GUI.Controller[]] {
    const gui = new GUI.GUI({ autoPlace: false, container: document.body });
    gui.domElement.id = "barycentric-gui";
    const barycentricControllers: GUI.Controller[] = [];

    return [gui, barycentricControllers]
}

export function createAdvancedGUI(
    scene: THREE.Scene, pointMesh: THREE.Mesh, triangleSpheres: THREE.Mesh[], spheresVisible: object, axesHelper: THREE.AxesHelper,
    onVertexColorChanged: Function, onVertexVisiblityChanged: Function, onPointMoved: (i: number) => void, onVertexMoved: (i: number) => void,
    resetAll: Function, resetCamera: Function, resetAppearance: Function, resetTriangle: Function, resetBarycentricCoordiantes: Function
) {
    const gui = new GUI.GUI().close();
    gui.domElement.id = "advanced-gui";

    const appearanceFolder = gui.addFolder("Appearance");
    appearanceFolder.addColor(scene, "background").name("Background").listen();
    appearanceFolder.addColor(pointMesh.material, "color").name("Point");
    for (let i = 0; i < 3; i++) {
        appearanceFolder.addColor(triangleSpheres[i].material, "color").name(`Vertex ${["A", "B", "C"][i]}`).listen().onChange(onVertexColorChanged);
    }
    appearanceFolder.add(spheresVisible, "value").name("Vertices").listen(true).onChange(onVertexVisiblityChanged);
    appearanceFolder.add(axesHelper, "visible").name("Axes").listen(true);

    const pointFolder = gui.addFolder("Point");
    addVectorControls(pointFolder, pointMesh.position, ["X", "Y", "Z"], onPointMoved);
    for (let i = 0; i < 3; i++) {
        addVectorControls(gui.addFolder(`Vertex ${["A", "B", "C"][i]}`), triangleSpheres[i].position, ["X", "Y", "Z"], onVertexMoved);
    }

    const resetFolder = gui.addFolder("Reset");
    resetFolder.add({ "All": resetAll }, "All");
    resetFolder.add({ "Camera": resetCamera }, "Camera");
    resetFolder.add({ "Appearance": resetAppearance }, "Appearance");
    resetFolder.add({ "Point": resetBarycentricCoordiantes }, "Point");
    resetFolder.add({ "Triangle": resetTriangle }, "Triangle");

    gui.add({ "Show Controls": () => window.alert(settings.controls) }, "Show Controls");

    return gui;
}