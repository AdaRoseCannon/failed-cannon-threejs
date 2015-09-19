/*global THREE*/
'use strict';
const MyThree = require('./lib/three');
const PhysicsWrapper = require('./lib/physicswrapper');
const addScript = require('./lib/loadScript');
const GoTargets = require('./lib/gotargets');

function serviceWorker() {

	return new Promise(function (resolve) {

		// Start service worker
		if ('serviceWorker' in navigator) {

			if (navigator.serviceWorker.controller) {
				console.log('Offlining Availble');
				resolve();
			} else {
				return navigator.serviceWorker.register('./sw.js')
				.then(function(reg) {
					console.log('sw registered', reg);
					location.reload();
				});
			}
		} else {
			console.error('No Service Worker');
		}
	});
}

serviceWorker()
.then(() => Promise.all([
	addScript('https://polyfill.webservices.ft.com/v1/polyfill.min.js?features=fetch,default'),
	addScript('./scripts/three.min.js')
]))
.then(() => Promise.all([
	addScript('https://cdn.rawgit.com/mrdoob/three.js/master/examples/js/effects/StereoEffect.js'),
	addScript('https://cdn.rawgit.com/richtr/threeVR/master/js/DeviceOrientationController.js'),
	addScript('https://cdn.rawgit.com/mrdoob/three.js/master/examples/js/MarchingCubes.js')
]))
.then(function () {
	console.log('Ready');
	const three = new MyThree();

	THREE.ImageUtils.loadTexture( "images/Baked.png" );

	const grid = new THREE.GridHelper( 10, 1 );
	grid.setColors( 0xff0000, 0xffffff );
	three.scene.add( grid );

	// three.metaballs.init();
	three.useDust();
	three.deviceOrientation({manualControl: true});

	// Run the verlet physics
	const physics = new PhysicsWrapper();

	physics.init()
	.then(function setUpMarching() {

		requestAnimationFrame(function animate() {
			physics.update()
				.then(() => {
					three.updateObjects(physics.objects);
					three.animate();
				});
			requestAnimationFrame(animate);
		});

		three.addObject('myScene')
		.then(scene => {

			const map = THREE.ImageUtils.loadTexture( "images/reticule.png" );
			const material = new THREE.SpriteMaterial( { map: map, color: 0xffffff, fog: false, transparent: true } );
			const sprite = new THREE.Sprite(material);
			three.hud.add(sprite);

			/* Pick out physics objects from the scene, send them to the physics engine */
			const hitBoxes = three.pickObjects(scene, /^Room.*Hitbox$/);
			console.log(hitBoxes);

			const balloons = three.pickObjects(scene, /balloon/i);
			console.log(balloons);

			/* Make the enviroment use the baked with no shading */
			const objects = three.pickObjects(scene, 'Room');
			objects.Room.material = new THREE.MeshBasicMaterial({map: objects.Room.material.map});

			/*Add a balloon to the scene with some attatched physics.*/
			// const p2 = physics.addGeometry({}, ...Object.keys(hitBoxes).map(k => hitBoxes[k]));

			Object.keys(hitBoxes).map(k => physics.addGeometry({}, hitBoxes[k]).then(() => three.scene.add(hitBoxes[k])));

			// window.scene = scene;
			three.scene.add(scene);

			const p1 = physics.addGeometry({
				mass: 0.1,
				damping: 0.9,
				position: {x: 0, y: 4, z:4}
			}, balloons['Balloon4-Hitbox'])
			.then(physics => {
				const o = balloons['Balloon4'].clone();
				three.scene.add(o);
				three.connectPhysicsToThree(o, physics);
			});

			/* Tapping on the screen will make it full sceens */
			const container = document.body;
			// container.addEventListener('click', setUpCardboard);

			function setUpCardboard() {

				// Stop deviceOrientation.js eating the click events.
				three.deviceOrientation({manualControl: false}); 

				three.useCardboard();
				window.addEventListener('resize', three.useCardboard);

				if (container.requestFullscreen) {
					container.requestFullscreen();
				} else if (container.msRequestFullscreen) {
					container.msRequestFullscreen();
				} else if (container.mozRequestFullScreen) {
					container.mozRequestFullScreen();
				} else if (container.webkitRequestFullscreen) {
					container.webkitRequestFullscreen();
				}
				container.removeEventListener('click', setUpCardboard);
			}

			window.three = three;
		});
	});
});
