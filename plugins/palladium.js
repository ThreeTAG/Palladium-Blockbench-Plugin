(function (id, options) {

    const CODEC = new Codec('palladium_entity_model', {
        name: 'Palladium Entity Model',
        extension: 'json',
        load_filter: {
            extensions: ['json'],
            type: 'json'
        },
        remember: true,
        compile: function () {
            let compiled = {};
            compiled.texture_width = Project.texture_width;
            compiled.texture_height = Project.texture_height;

            let mesh = {};

            for (node of Outliner.root) {
                if (node instanceof Group) {
                    mesh[node.name] = serializePart(node, [0, 0, 0]);
                }
            }

            compiled.mesh = mesh;

            console.log(compiled);
            console.log(mesh);

            return JSON.stringify(compiled, null, 4);
        },
        load(model, file) {
            Project.texture_width = model.texture_width;
            Project.texture_height = model.texture_height;

            Object.entries(model.mesh).forEach(item => {
                const name = item[0];
                const part = item[1];
                parsePart(name, part, [0, 0, 0]);
            });
        },
        export_action: new Action("export_palladium_entity", {
            name: 'Export Palladium Entity Model',
            icon: 'icon-format_java',
            category: 'file',
            click: () => CODEC.export()
        }),
    });

    const FORMAT = new ModelFormat({
        id: 'palladium_entity_model',
        icon: 'icon-format_java',
        name: 'Palladium Entity Model',
        description: "Entity model for the Palladium Mod",
        show_on_start_screen: true,
        box_uv: true,
        optional_box_uv: false,
        single_texture: true,
        bone_rig: true,
        centered_grid: true,
        rotate_cubes: false,
        integer_size: false,
        locators: false,
        canvas_limit: false,
        rotation_limit: false,
        display_mode: true,
        animation_mode: false,
        codec: CODEC,
        onActivation() {
            MenuBar.addAction(CODEC.export_action, "file.export");
        },
        onDeactivation() {
            CODEC.export_action.delete();
        }
    });

    function parsePart(name, json, pOrigin, parent = null) {
        let origin = pOrigin;
        const offset = json.part_pose && json.part_pose.offset ? json.part_pose.offset : [0, 0, 0];
        origin = [origin[0] + offset[0], origin[1] + offset[1], origin[2] + offset[2]];
        const rotation = json.part_pose && json.part_pose.rotation ? json.part_pose.rotation : [0, 0, 0];
        const group = new Group(
            {
                name: name,
                origin: flipY(origin),
                rotation: rotation,
            }
        ).addTo(parent);
        group.init();

        if (json.cubes) {
            json.cubes.forEach(cube => {
                const cubeOrigin = cube.origin;
                const dimensions = cube.dimensions;
                const textureOffset = cube.texture_offset ? cube.texture_offset : [0, 0];
                const textureScale = cube.texture_scale ? cube.texture_scale : [0, 0];
                const deformation = cube.deformation ? cube.deformation : [1, 1, 1];
                const mirror = cube.mirror;

                let pos = cubeOrigin;
                pos = [pos[0] + origin[0], pos[1] + origin[1], pos[2] + origin[2]]

                cube = new Cube({
                    mirror_uv: mirror,
                    name: 'cube',
                    inflate: deformation[0],
                    from: flipY([pos[0], pos[1] + dimensions[1], pos[2]]),
                    to: flipY([pos[0] + dimensions[0], pos[1], pos[2] + dimensions[2]]),
                    uv_offset: textureOffset
                });
                cube.init();

                cube.addTo(group);
            });
        }

        if (json.children) {
            Object.entries(json.children).forEach(item => {
                const name = item[0];
                const part = item[1];
                parsePart(name, part, origin, group);
            });
        }
    }

    function serializePart(part, pOrigin) {
        let compiled = {};
        let bOrigin = flipY(part.origin);
        let origin = [bOrigin[0] - pOrigin[0], bOrigin[1] - pOrigin[1], bOrigin[2] - pOrigin[2]];

        compiled.part_pose = {};
        compiled.part_pose.offset = origin;
        compiled.part_pose.rotation = part.rotation;

        compiled.cubes = [];
        let children = {};

        for (node of part.children) {
            if (node instanceof Group) {
                if (node.parent !== part) {
                    continue;
                }
                children[node.name] = serializePart(node, bOrigin);
            } else if (node instanceof Cube) {
                if (node.parent !== part) {
                    console.log('wech damit');
                    continue;
                }

                let cube = {};

                if (node.name !== "cube") {
                    cube.name = node.name;
                }

                let to = node.to;
                let from = node.from;
                let size = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
                let pos = flipY([from[0], from[1] + size[1], from[2]]);
                cube.origin = [pos[0] - bOrigin[0], pos[1] - bOrigin[1], pos[2] - bOrigin[2]];
                cube.dimensions = size;
                cube.texture_offset = node.uv_offset;

                if (node.mirror_uv) {
                    cube.mirror = true;
                }
                if (node.inflate > 0) {
                    cube.deformation = [node.inflate, node.inflate, node.inflate];
                }

                compiled.cubes.push(cube);
            }
        }

        if (children !== {}) {
            compiled.children = children;
        }

        return compiled;
    }

    Plugin.register('palladium', {
        title: 'Palladium',
        author: 'Lucraft',
        description: 'Export/import for Palladium models',
        icon: 'looks_3',
        version: '0.0.1',
        variant: 'both',
    });

    function flipY(vec) {
        return [vec[0], -vec[1], vec[2]];
    }
})();