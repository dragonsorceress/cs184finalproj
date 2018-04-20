import THREE from 'lib/three';
import Renderer from 'lib/renderer';

class T5Renderer extends Renderer {
  initScene() {
    if (!this.checkShader(vert, frag)) {
      this.setErrorScene();
      return;
    }

  update(dt) {
    if (!this.focussed) {
      this.updateCamera(dt / 12000);
    }
  }
}

export default T5Renderer;