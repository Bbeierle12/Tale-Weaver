# PlaneVisualizer.gd — core visualizer node (§1 Goals & Context, §6 Camera, §7 Interactivity)
tool
extends Node3D

@export var grid_size     : Vector2i    = Vector2i(256, 256)
@export var cell_size     : float       = 1.0
@export var tilt_angle    : float       = 30.0
@export var data_texture  : Texture2D
@export var color_ramp    : Texture2D
@export var emissive_ramp : Texture2D
@export var height_scale  : float       = 1.0
@export var threshold_emissive : float  = 0.8

onready var mesh_instance := MeshInstance3D.new()
onready var shader_mat    := ShaderMaterial.new()
onready var camera        := Camera3D.new()
onready var dir_light     := DirectionalLight3D.new()

func _init():
    # §2: build a plane mesh grid_size × grid_size
    var plane = PlaneMesh.new()
    plane.size = Vector2(grid_size.x * cell_size, grid_size.y * cell_size)
    mesh_instance.mesh = plane
    add_child(mesh_instance)

func _ready():
    # apply tilt (§2)
    rotation_degrees.x = tilt_angle

    # assign shader (§3)
    shader_mat.shader = preload("res://addons/ecosysx/shaders/plane_shader.gdshader")
    shader_mat.set_shader_param("data_texture", data_texture)
    shader_mat.set_shader_param("color_ramp", color_ramp)
    shader_mat.set_shader_param("emissive_ramp", emissive_ramp)
    shader_mat.set_shader_param("height_scale", height_scale)
    shader_mat.set_shader_param("threshold_emissive", threshold_emissive)
    mesh_instance.material_override = shader_mat

    # setup camera (§6)
    camera.fov = 60
    camera.transform.origin = Vector3(0, 10, -15)
    camera.look_at(Vector3.ZERO, Vector3.UP)
    add_child(camera)

    # setup default lighting (§4)
    dir_light.light_energy = 1.0
    dir_light.transform.basis = Basis().rotated(Vector3(1,0,0), deg2rad(-60))
    add_child(dir_light)

    # listen for quality changes (§8)
    if Engine.has_singleton("QualitySettings"):
        QualitySettings.connect("quality_changed", callable(self, "_on_quality_changed"))

func update_data(new_tex: Texture2D) -> void:
    # dynamic data ingestion (hot-reload each frame)
    shader_mat.set_shader_param("data_texture", new_tex)

func _on_quality_changed(idx: int) -> void:
    # stub: toggle shadows or mesh detail based on quality
    dir_light.shadow_enabled = (idx == 0)

func _unhandled_input(event):
    # §7 Interactivity: hover & click stubs
    if event is InputEventMouseMotion:
        _handle_hover(event.position)
    elif event is InputEventMouseButton and event.pressed:
        _handle_click(event.position)

func _handle_hover(pos: Vector2) -> void:
    # TODO: perform raycast, highlight cell, show tooltip
    pass

func _handle_click(pos: Vector2) -> void:
    # TODO: inject events (spawn agents / paint nutrients)
    pass
