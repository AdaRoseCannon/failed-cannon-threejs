/*jshint worker:true*/

'use strict';

importScripts('./three.min.js'); // loaded from vendor dir
const Cannon = require('cannon');
const fetchJSON = require('./lib/fetchJSON.js');
const fixGeometry = require('./lib/fixGeometry');

const world = new Cannon.World();
const customObjects = [];

world.gravity.set(0, -9.8, 0);
world.broadphase = new Cannon.NaiveBroadphase();
world.solver.iterations = 20;

let oldT = 0;
function animate() {

	const t = Date.now();
	const dT = (t - oldT) / 1000;

	world.step(dT);
	oldT = t;
}

function fromObject({id, mass, damping}) {

	return fetchJSON('../models/' + id + '.json')
	.then(scene => {

		const newScene = fixGeometry.parse(scene);
		return fromGeometry({geometry: fixGeometry.getGeomFromScene(newScene), mass, damping});
	});
}

// data [{geom, center}]
const l = new THREE.JSONLoader();
function fromGeometry({geometry, mass}) {
	if (!mass) mass = 0;
	const modelBody = new Cannon.Body({ mass });

	geometry.forEach(geometry => {

		geometry = l.parse(geometry).geometry;

		// Construct polyhedron
		const modelPart = new Cannon.ConvexPolyhedron(
			geometry.vertices.map(v => new Cannon.Vec3(
				v.x,
				v.y,
				v.z
			)),
			geometry.faces.map(f => [f.a, f.b, f.c])
		);

		// Add to compound
		modelBody.addShape(modelPart);
	});

	// modelBody.linearDamping = damping;

	// Create body
	// modelBody.quaternion.setFromAxisAngle(new Cannon.Vec3(1, 0, 0), Math.PI / 2);
	return Promise.resolve(modelBody);
}

// Recieve messages from the client and reply back onthe same port
self.addEventListener('message', function(event) {
		Promise.resolve()
		.then(function () {

			switch(event.data.action) {
				case 'init':

					world.defaultContactMaterial.contactEquationStiffness = 5e7;
					world.defaultContactMaterial.contactEquationRelaxation = 4;
					return;

				case 'getModelData':
					animate();
					event.data.modelData = customObjects.map(p => ({

						// swap y,z for exporting
						position: p.position,
						quaternion: p.quaternion,
						meta: p.meta,
						id: p.id
					}));
					return;

				case 'addObject':
					return fromObject({
						id: event.data.options.id,
						mass: event.data.options.mass || 0
					}).then(body2 => {
						const p = event.data.options.position || {x: 0, y:0, z:0};
						body2.position.set(p.x, p.y, p.z);
						body3.linearDamping = event.data.options.damping || 0,
						event.data.id = body2.id;
						customObjects.push(body2);
						body2.meta = event.data.options.meta || {};
						body2.meta.type = 'genericObject';
						world.addBody(body2);
					});

				case 'addGeometry':
					return fromGeometry({
						geometry: event.data.options.geometry,
						mass: event.data.options.mass || 0
					}).then(body3 => {
						const p = event.data.options.position || {x: 0, y:0, z:0};
						body3.position.set(p.x, p.y, p.z);
						body3.linearDamping = event.data.options.damping || 0,
						event.data.id = body3.id;
						customObjects.push(body3);
						body3.meta = event.data.options.meta || {};
						body3.meta.type = 'genericObject';
						world.addBody(body3);
					});

				case 'addPoint':
					const body1 = new Cannon.Body({
						mass: event.data.pointOptions.mass,
						velocity: event.data.pointOptions.velocity,
						position: event.data.pointOptions.position
					});
					body1.addShape(new Cannon.Sphere(event.data.pointOptions.radius));
					world.addBody(body1);
					customObjects.push(body1);
					body1.meta = event.data.pointOptions.meta || {};
					body1.meta.type = 'point';
					body1.meta.radius = event.data.pointOptions.radius;

					body1.linearDamping = 0.01;
					return;

				default:
					throw Error('Invalid Action');
			}
		})
		.then(function () {
			event.data.success = true;
		}, function (err) {
			console.error(err);
			event.data.success = false;
			if (err) {
				event.data.message = err.message ? err.message : err;
			}
		})
		.then(function () {
			event.ports[0].postMessage(event.data);
		});
});
