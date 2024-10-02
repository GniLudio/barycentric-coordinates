import * as THREE from 'three';
import * as GUI from 'lil-gui';

export function addVectorControls(folder: GUI.GUI, obj: THREE.Vector3, names: string[], onChange?: (i: number) => void, decimals: number = 1): GUI.Controller[] {
    return ["x", "y", "z"].map((e, i) => {
        const controller = folder.add(obj, e).name(names[i]).decimals(decimals).step(0.1 ** decimals).listen(true);
        if (onChange) controller.onChange(() => onChange(i));
        return controller;
    });
}

export function keepPointInsideTriangle(triangle: THREE.Triangle, position: THREE.Vector3): void {
    triangle.closestPointToPoint(position, position);
}

export function projectPointOntoPlane(lineOrigin: THREE.Vector3, lineDirection: THREE.Vector3, planeOrigin: THREE.Vector3, planeNormal: THREE.Vector3, epsilon: number = 1e-6): THREE.Vector3 | undefined {
    const dot = planeNormal.dot(lineDirection);
    if (Math.abs(dot) > epsilon) {
        return lineOrigin.clone().add(lineDirection.multiplyScalar(-planeNormal.dot(lineOrigin.clone().sub(planeOrigin)) / dot));
    }
    return undefined;
}


export function convertMeshesToTriangle(meshes: THREE.Mesh[]): THREE.Triangle {
    return new THREE.Triangle(...meshes.map((mesh) => mesh.position));
}