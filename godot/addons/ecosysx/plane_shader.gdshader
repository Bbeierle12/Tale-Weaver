// plane_shader.gdshader — heatmap + height + emissive pulse (§3 Materiality & Shader Design)
shader_type spatial;
render_mode cull_back, unshaded;

uniform sampler2D data_texture : hint_albedo;    // simulation data layer
uniform sampler2D color_ramp    : hint_albedo;    // 1D LUT for colormap
uniform sampler2D emissive_ramp : hint_albedo;    // LUT for emissive glow
uniform float     height_scale        = 1.0;     // vertical exaggeration
uniform float     threshold_emissive  = 0.8;     // glow threshold [0–1]

void vertex() {
    // §2 Form & Composition: apply height displacement
    float v = texture(data_texture, UV).r;
    VERTEX.y += v * height_scale;
}

void fragment() {
    // map data → color
    float v = texture(data_texture, UV).r;
    ALBEDO = texture(color_ramp, vec2(v, 0.0)).rgb;
    // emissive highlight when above threshold
    if (v > threshold_emissive) {
        float t = (v - threshold_emissive) / (1.0 - threshold_emissive);
        EMISSION = texture(emissive_ramp, vec2(t, 0.0)).rgb;
    }
}
