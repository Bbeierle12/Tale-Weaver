extends Control

var _progress_bar: ProgressBar

func _ready() -> void:
    var panel := Panel.new()
    add_child(panel)
    panel.anchor_left = 0.25
    panel.anchor_top = 0.20
    panel.anchor_right = 0.75
    panel.anchor_bottom = 0.80
    panel.margin_left = 0
    panel.margin_top = 0
    panel.margin_right = 0
    panel.margin_bottom = 0

    var vbox := VBoxContainer.new()
    panel.add_child(vbox)
    vbox.anchor_left = 0
    vbox.anchor_top = 0
    vbox.anchor_right = 1
    vbox.anchor_bottom = 1
    vbox.margin_left = 16
    vbox.margin_top = 16
    vbox.margin_right = -16
    vbox.margin_bottom = -16
    vbox.spacing = 12

    var title_label := Label.new()
    title_label.text = "EcoSysX Simulator"
    title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    vbox.add_child(title_label)

    var input_field := LineEdit.new()
    input_field.placeholder_text = "Enter system parameter..."
    input_field.size_flags_horizontal = Control.SIZE_EXPAND_FILL
    vbox.add_child(input_field)

    var start_button := Button.new()
    start_button.text = "Start Simulation"
    start_button.pressed.connect(_on_start_pressed)
    vbox.add_child(start_button)

    var spacer := Control.new()
    spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
    vbox.add_child(spacer)

    _progress_bar = ProgressBar.new()
    _progress_bar.min_value = 0
    _progress_bar.max_value = 100
    _progress_bar.value = 0
    _progress_bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
    vbox.add_child(_progress_bar)

func _on_start_pressed() -> void:
    print("Start Simulation pressed!")
    _progress_bar.value = 0
    var steps := 100
    var wait_time := 1.0 / steps
    for i in range(steps + 1):
        _progress_bar.value = i
        await get_tree().create_timer(wait_time).timeout
