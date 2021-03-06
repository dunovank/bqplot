/* Copyright 2015 Bloomberg Finance L.P.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define(["d3", "./Mark"], function(d3, MarkViewModule) {
    "use strict";

    var Label = MarkViewModule.Mark.extend({
        render: function() {
            var base_render_promise = Label.__super__.render.apply(this);
            var that = this;

            //TODO: create_listeners is put inside the promise success handler
            //because some of the functions depend on child scales being
            //created. Make sure none of the event handler functions make that
            //assumption.
            this.drag_listener = d3.behavior.drag()
              .origin(function() { return that.drag_origin(); })
              .on("drag", function() { return that.on_drag(); })
              .on("dragend", function() { return that.drag_ended(); });
            return base_render_promise.then(function() {
                that.create_listeners();
                that.draw();
            });
        },
        set_ranges: function() {
            var x_scale = this.scales.x;
            if(x_scale) {
                x_scale.set_range(this.parent.padded_range("x", x_scale.model));
            }
            var y_scale = this.scales.y;
            if(y_scale) {
                y_scale.set_range(this.parent.padded_range("y", y_scale.model));
            }
        },
        set_positional_scales: function() {
            this.x_scale = this.scales.x;
            this.y_scale = this.scales.y;
            // If no scale for "x" or "y" is specified, figure scales are used.
            if(!this.x_scale) {
                this.x_scale = this.parent.scale_x;
            }
            if(!this.y_scale) {
                this.y_scale = this.parent.scale_y;
            }
            this.listenTo(this.x_scale, "domain_changed", function() {
                if (!this.model.dirty) { this.draw(); }
            });
            this.listenTo(this.y_scale, "domain_changed", function() {
                if (!this.model.dirty) { this.draw(); }
            });
        },
        create_listeners: function() {
            Label.__super__.create_listeners.apply(this);
            this.listenTo(this.model, "change:text", this.update_text, this);
            this.listenTo(this.model, "change:enable_move", this.set_drag_behavior);
            this.model.on_some_change(["font_weight", "font_size", "color",
                                       "align"], this.update_style, this);
            this.model.on_some_change(["x", "y", "x_offset", "y_offset",
                                       "rotate_angle"], this.update_position, this);
        },
        relayout: function() {
            this.set_ranges();
            this.update_position();
        },
        draw: function() {
            this.set_ranges();
            this.el.selectAll(".label")
                .remove();

            this.el.append("text")
                .text(this.model.get("text"))
                .classed("label", true);
                
            this.set_drag_behavior();    
            this.update_style();
            this.update_position();
        },
        get_rotation: function() {
            var rotate_angle = this.model.get("rotate_angle");
            var transform = "";
            if(rotate_angle !== undefined) {
                transform += " rotate(" + rotate_angle + ")";
            }
            return transform;
        },
        update_position: function() {
            var x = (this.x_scale.model.type === "date") ?
                this.model.get_date_elem("x") : this.model.get("x");
            var y = (this.y_scale.model.type === "date") ?
                this.model.get_date_elem("y") : this.model.get("y");
            var x_offset = this.model.get("x_offset"),
                y_offset = this.model.get("y_offset");
            this.el.select(".label")
                .attr("transform", "translate(" + 
                    (this.x_scale.scale(x) + this.x_scale.offset + x_offset) + "," +
                    (this.y_scale.scale(y) + this.y_scale.offset + y_offset) + ")" +
                    this.get_rotation());
        },
        update_text: function(model, value) {
            this.el.select(".label")
                .text(value);
        },
        update_style: function() {
            this.el.select(".label")
                .style("font-size", this.model.get("font_size"))
                .style("font-weight", this.model.get("font_weight"))
                .style("text-anchor", this.model.get("align"));
            
            var color = this.model.get("color");
            if(color !== undefined) {
                this.el.select(".label")
                    .style("fill", color);
            }
        },
        set_drag_behavior: function() {
            var label = this.el.select(".label");
            if (this.model.get("enable_move")) {
                label.call(this.drag_listener);
            }
            else { 
                label.on(".drag", null); 
            }
        },
        drag_origin: function() {
            var transform = d3.transform(this.el.select(".label").attr("transform"));
            return {x: transform.translate[0], y: transform.translate[1]};
        },
        on_drag: function() {
            var transform = d3.transform(this.el.select(".label").attr("transform"));
            transform.translate = [d3.event.x, d3.event.y];
            this.el.select(".label")
                .attr("transform", transform.toString());
        },
        drag_ended: function() {
            var transform = d3.transform(this.el.select(".label").attr("transform"));
            var new_x = this.x_scale.invert(transform.translate[0] - this.model.get("x_offset")),
                new_y = this.y_scale.invert(transform.translate[1] - this.model.get("y_offset"));
                
            this.model.set("x", new_x);
            this.model.set("y", new_y);
            this.touch()
        },
    });

    return {
        Label: Label,
    };
});

