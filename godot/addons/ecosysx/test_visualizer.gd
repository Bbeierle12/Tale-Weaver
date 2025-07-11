# test_visualizer.gd — automated headless checks (§9 Verification)
extends Node

func _run():
    var scene = preload("res://addons/ecosysx/PlaneVisualizer.tscn").instantiate()
    add_child(scene)
    # 1. Plane appears
    assert(scene.mesh_instance != null, "MeshInstance missing")
    # 2. Camera controls exist
    assert(scene.camera != null, "Camera3D missing")
    # 3. Performance sanity (>=120 fps)
    var fps = Engine.get_frames_per_second()
    if fps < 120:
        push_error("FPS below target: %d" % fps)
    get_tree().quit()
