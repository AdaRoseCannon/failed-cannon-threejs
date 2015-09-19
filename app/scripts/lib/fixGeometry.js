/*global THREE*/
'use strict';

module.exports.parse = function (sceneIn) {
	const loader = new THREE.ObjectLoader();
	const scene = loader.parse(sceneIn);
	return scene;
};

// used for populating cannon
// it bakes on the matrix transform to the vertex
module.exports.getGeomFromScene = function (scene) {
	const geoms = [];
	scene.children.forEach(mesh => {
		if (mesh.type !== 'Mesh') return;
		const geometry = mesh.geometry.clone();
		mesh.updateMatrix();
		mesh.updateMatrixWorld();
		const posMat = new THREE.Matrix4();
		mesh.matrixWorld.copyPosition(posMat);
		console.log(posMat.elements);
		const center = [0, 0, 0];
		posMat.applyToVector3Array(center);
		geometry.vertices.map(v => v.applyMatrix4(mesh.matrixWorld));
		geoms.push(geometry.toJSON().data);
	});
	return geoms;
};
