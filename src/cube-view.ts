import {
  BoxGeometry, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry,
  Scene, Vector3, WebGLRenderer,
} from 'three'
import type { Quaternion } from 'three'
import { faces } from './virtual-cube'
import type { Face, VirtualCube } from './virtual-cube'
import { TurnPresentation } from './turn-presentation'

export function createCubeView(
  container: HTMLElement, cube: VirtualCube, rotation: Quaternion, onDraw: () => void,
) {
  const renderer = new WebGLRenderer({ alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.domElement.setAttribute('role', 'img')
  renderer.domElement.setAttribute('aria-label', 'Live 3D virtual cube')
  container.append(renderer.domElement)

  const scene = new Scene()
  const camera = new PerspectiveCamera(32, 1, 0.1, 50)
  const group = new Group()
  const layer = new Group()
  group.add(layer)
  scene.add(group)
  const presentation = new TurnPresentation(cube)

  const plastic = new MeshBasicMaterial({ color: 0x101317 })
  const cubie = new BoxGeometry(0.984, 0.984, 0.984)
  const bodies: Mesh[] = []
  for (const x of [-1, 0, 1]) {
    for (const y of [-1, 0, 1]) {
      for (const z of [-1, 0, 1]) {
        if (!x && !y && !z) continue
        const body = new Mesh(cubie, plastic)
        body.position.set(x, y, z)
        group.add(body)
        bodies.push(body)
      }
    }
  }

  const stickerGeometry = new PlaneGeometry(0.84, 0.84)
  const materials = Object.fromEntries(Object.entries(faces).map(([face, { color }]) =>
    [face, new MeshBasicMaterial({ color })]))
  const stickers = cube.stickers.map(sticker => {
    const mesh = new Mesh(stickerGeometry, materials[sticker.color])
    group.add(mesh)
    return mesh
  })
  const front = new Vector3(0, 0, 1)
  const normal = new Vector3()
  const axis = new Vector3()
  let frame: number | null = null
  let layoutNeeded = true
  let previousTurn: ReturnType<TurnPresentation['frame']>['turn']

  function draw(now: number) {
    frame = null
    const { changed, turn, angle } = presentation.frame(now)
    if (layoutNeeded || changed || turn !== previousTurn) {
      presentation.cube.stickers.forEach((sticker, index) => {
        const mesh = stickers[index]
        normal.fromArray(sticker.normal)
        mesh.position.fromArray(sticker.position).addScaledVector(normal, 0.495)
        mesh.quaternion.setFromUnitVectors(front, normal)
        const parent = turn && sticker.position[turn.axis] === turn.side ? layer : group
        if (mesh.parent !== parent) parent.add(mesh)
      })
      for (const body of bodies) {
        const parent = turn && body.position.getComponent(turn.axis) === turn.side ? layer : group
        if (body.parent !== parent) parent.add(body)
      }
      previousTurn = turn
      layoutNeeded = false
    }
    if (turn) layer.quaternion.setFromAxisAngle(axis.set(0, 0, 0).setComponent(turn.axis, 1), angle)
    else layer.quaternion.identity()
    group.quaternion.copy(rotation)
    renderer.render(scene, camera)
    onDraw()
    if (turn) requestDraw()
  }

  function requestDraw() {
    if (frame === null) frame = requestAnimationFrame(draw)
  }

  function resize() {
    const { clientWidth: width, clientHeight: height } = container
    if (!width || !height) return
    camera.aspect = width / height
    const distance = 9.8 / Math.min(1, camera.aspect)
    camera.position.set(0.32, 0.34, 1).setLength(distance)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    requestDraw()
  }

  new ResizeObserver(resize).observe(container)
  resize()
  return {
    requestDraw,
    setColors(colors: Record<Face, number>) {
      for (const face of Object.keys(colors) as Face[]) materials[face].color.setHex(colors[face])
      requestDraw()
    },
    enqueueTurn(move: string) {
      presentation.enqueue(move)
      requestDraw()
    },
    replacePuzzle() {
      presentation.replace()
      requestDraw()
    },
  }
}
