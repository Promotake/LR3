/* One-finger orbit / two-finger zoom on phones; mouse drag / wheel on PC.
 * Compatible with A-Frame 1.3.0. No external controls package required.
 */
(function () {
  'use strict';
  if (!window.AFRAME) return;
  AFRAME.registerComponent('orbit-drag', {
    schema: {
      target: {type: 'vec3', default: {x:0,y:1,z:-4}},
      distance: {type: 'number', default: 7},
      minDistance: {type: 'number', default: 3},
      maxDistance: {type: 'number', default: 14},
      azimuth: {type: 'number', default: 17},
      elevation: {type: 'number', default: 14}
    },
    init: function () {
      var self = this;
      this.theta = THREE.MathUtils.degToRad(this.data.azimuth);
      this.phi = THREE.MathUtils.degToRad(this.data.elevation);
      this.radius = this.data.distance;
      this.pointers = new Map();
      this.lastPinch = null;
      this._lookMatrix = new THREE.Matrix4();
      this._targetVector = new THREE.Vector3();
      this.paintView();
      // A-Frame may apply primitive defaults after component initialization.
      // Re-apply the orbit transform once the camera entity is fully loaded.
      this._onReady = () => this.paintView();
      if (!this.el.hasLoaded) this.el.addEventListener('loaded', this._onReady, {once: true});
      this._bindDown = function (ev) {self.down(ev)};
      this._bindMove = function (ev) {self.move(ev)};
      this._bindUp = function (ev) {self.up(ev)};
      this._bindWheel = function (ev) {self.wheel(ev)};
      this._attach = function () {self.attach()};
      if (this.el.sceneEl.canvas) this.attach();
      else this.el.sceneEl.addEventListener('renderstart',this._attach,{once:true});
    },
    attach: function () {
      if (this.canvas) return;
      this.canvas = this.el.sceneEl.canvas;
      if (!this.canvas) return;
      this.canvas.style.touchAction = 'none';
      this.canvas.addEventListener('pointerdown',this._bindDown);
      this.canvas.addEventListener('pointermove',this._bindMove);
      this.canvas.addEventListener('pointerup',this._bindUp);
      this.canvas.addEventListener('pointercancel',this._bindUp);
      this.canvas.addEventListener('wheel',this._bindWheel,{passive:false});
    },
    clamp: function () {
      this.phi = Math.max(-0.14,Math.min(1.20,this.phi));
      this.radius = Math.max(this.data.minDistance,Math.min(this.data.maxDistance,this.radius));
    },
    paintView: function () {
      this.clamp();
      var t=this.data.target, cp=Math.cos(this.phi);
      var x=t.x+this.radius*Math.sin(this.theta)*cp;
      var y=t.y+this.radius*Math.sin(this.phi);
      var z=t.z+this.radius*Math.cos(this.theta)*cp;
      this.el.object3D.position.set(x,y,z);
      // CRITICAL: <a-camera> is a Group wrapping a PerspectiveCamera.
      // Group.lookAt(target) points the group's +Z axis at the model,
      // but a camera sees along -Z. That made the view face backwards.
      // Matrix4.lookAt uses camera convention (-Z toward the target).
      this._targetVector.set(t.x,t.y,t.z);
      this._lookMatrix.lookAt(this.el.object3D.position, this._targetVector, this.el.object3D.up);
      this.el.object3D.quaternion.setFromRotationMatrix(this._lookMatrix);
    },
    reset: function () {
      this.theta=THREE.MathUtils.degToRad(this.data.azimuth);
      this.phi=THREE.MathUtils.degToRad(this.data.elevation);
      this.radius=this.data.distance;
      this.pointers.clear();this.lastPinch=null;
      this.paintView();
    },
    down: function (ev) {
      if (ev.pointerType==='mouse' && ev.button!==0) return;
      this.pointers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
      if (this.pointers.size===2) {
        var pts=Array.from(this.pointers.values());
        this.lastPinch=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
      }
      if (ev.cancelable) ev.preventDefault();
      try {this.canvas.setPointerCapture(ev.pointerId)}catch (_) {}
    },
    move: function (ev) {
      if (!this.pointers.has(ev.pointerId)) return;
      var old=this.pointers.get(ev.pointerId);
      this.pointers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
      if (this.pointers.size===1) {
        this.theta-=(ev.clientX-old.x)*0.006;
        this.phi+=(ev.clientY-old.y)*0.005;
      } else if (this.pointers.size===2) {
        var pts=Array.from(this.pointers.values());
        var distance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
        if (this.lastPinch && distance>0) this.radius*=this.lastPinch/distance;
        this.lastPinch=distance;
      }
      if (ev.cancelable) ev.preventDefault();
      this.paintView();
    },
    up: function (ev) {
      this.pointers.delete(ev.pointerId);
      this.lastPinch=null;
    },
    wheel: function (ev) {
      if (ev.cancelable) ev.preventDefault();
      this.radius*=Math.exp(ev.deltaY*0.001);
      this.paintView();
    },
    remove: function () {
      if (!this.canvas) return;
      this.canvas.removeEventListener('pointerdown',this._bindDown);
      this.canvas.removeEventListener('pointermove',this._bindMove);
      this.canvas.removeEventListener('pointerup',this._bindUp);
      this.canvas.removeEventListener('pointercancel',this._bindUp);
      this.canvas.removeEventListener('wheel',this._bindWheel);
    }
  });
})();
