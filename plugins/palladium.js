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

            compiled.mesh = {};
            for (node of Outliner.root) {
                if (node instanceof Group) {
                    compiled.mesh[node.name] = compileBone(node, [0, 0, 0]);
                }
            }

            return JSON.stringify(compiled, null, 4);
        },
        load(model, file) {
            Project.texture_width = model.texture_width;
            Project.texture_height = model.texture_height;
            let bones = model.mesh;

            for (key in bones) {
                addBone(undefined, [0, 0, 0], key, bones[key]);
            }
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

    function addBone(parent, pOrigin, key, bone) {
        let gopts = {name: key, children: []};

        let origin = pOrigin;
        if ("part_pose" in bone) {
            if ("offset" in bone.part_pose) {
                let bor = bone.part_pose.offset;
                origin = [origin[0] + bor[0], origin[1] + bor[1], origin[2] + bor[2]];
            }
            if ("rotation" in bone.part_pose) {
                let rot = bone.part_pose.rotation;
                gopts.rotation = [-rot[0], -rot[1], rot[2]];
            }
        }
        gopts.origin = flipCoords(origin);

        let group = new Group(gopts);

        if (parent !== undefined) {
            group.addTo(parent);
        }

        group = group.init();

        for (cuboid of bone.cubes) {
            let copts = {name: "cube"};

            if ("name" in cuboid) {
                copts.name = cuboid.name;
            }
            if ("deformation" in cuboid) {
                copts.inflate = cuboid.deformation[0];
            }
            if ("mirror" in cuboid) {
                copts.mirror_uv = cuboid.mirror;
            }

            let pos = cuboid.origin;
            pos = [pos[0] + origin[0], pos[1] + origin[1], pos[2] + origin[2]]
            let size = cuboid.dimensions;
            copts.to = flipCoords([pos[0], pos[1], pos[2] + size[2]]);
            copts.from = flipCoords([pos[0] + size[0], pos[1] + size[1], pos[2]]);

            copts.uv_offset = cuboid.texture_offset;

            new Cube(copts).addTo(group).init();
        }

        for (ckey in bone.children) {
            addBone(group, origin, ckey, bone.children[ckey]);
        }
    }

    function compileBone(bone, pOrigin) {
        let compiled = {};

        let bOrigin = flipCoords(bone.origin); // bone origin
        let origin = [bOrigin[0] - pOrigin[0], bOrigin[1] - pOrigin[1], bOrigin[2] - pOrigin[2]]; // origin to write to json

        if (!isZero(origin)) {
            if (!("part_pose" in compiled)) compiled.part_pose = {};
            compiled.part_pose.offset = origin;
        }

        let brot = bone.rotation;
        let rotation = [-brot[0], -brot[1], brot[2]];
        console.log(rotation);
        if (!isZero(rotation)) {
            if (!("part_pose" in compiled)) compiled.part_pose = {};
            compiled.part_pose.rotation = rotation;
        }

        compiled.cubes = [];

        let children = {}
        for (node of bone.children) {
            if (node instanceof Group) {
                if (node.parent !== bone) {
                    continue;
                }

                children[node.name] = compileBone(node, bOrigin);
            }
            if (node instanceof Cube) {
                if (node.parent !== bone) {
                    continue;
                }

                let cuboid = {}

                if (node.name !== "cube") {
                    cuboid.name = node.name;
                }

                let to = node.to;
                let from = node.from;

                let size = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
                let pos = flipCoords([from[0] + size[0], from[1] + size[1], from[2]]);

                cuboid.origin = [pos[0] - bOrigin[0], pos[1] - bOrigin[1], pos[2] - bOrigin[2]];
                cuboid.dimensions = size;
                cuboid.texture_offset = node.uv_offset;

                if (node.mirror_uv) {
                    cuboid.mirror = true;
                }
                if (node.inflate !== 0) {
                    cuboid.deformation = [node.inflate, node.inflate, node.inflate];
                }

                compiled.cubes.push(cuboid);
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

    function flipCoords(vec) {
        return [-vec[0], -vec[1], vec[2]];
    }

    function flipY(vec) {
        return [vec[0], -vec[1], vec[2]];
    }

    function isZero(vec) {
        for (c of vec) {
            if (c !== 0) {
                return false;
            }
        }
        return true;
    }
})();
