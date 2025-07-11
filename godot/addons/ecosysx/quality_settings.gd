# QualitySettings.gd — toggles between High/Medium/Low graphics modes (§8 Performance budgets)
extends Node
signal quality_changed(index)

@export var quality_levels: Array = ["High", "Medium", "Low"]
@export var current_quality: int = 0 setget set_quality

func set_quality(idx: int) -> void:
    current_quality = clamp(idx, 0, quality_levels.size() - 1)
    emit_signal("quality_changed", current_quality)
