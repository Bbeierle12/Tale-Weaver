extends Node

class_name SimulationManager

var tick_rate: float = 60.0 # ticks per second
var accumulator: float = 0.0
var systems := []
var world: Node = null
var paused: bool = false

func _ready():
    print("[Simulation] Manager ready")
    # Placeholder world setup
    world = Node.new()
    add_child(world)

func register_system(system: Object) -> void:
    systems.append(system)

func clear_systems() -> void:
    systems.clear()

func _process(delta: float) -> void:
    if paused:
        return
    accumulator += delta
    var step := 1.0 / tick_rate
    while accumulator >= step:
        _tick(step)
        accumulator -= step

func _tick(step: float) -> void:
    for s in systems:
        if s.has_method("tick"):
            s.tick(world, step)

func pause_simulation():
    paused = true

func resume_simulation():
    paused = false
