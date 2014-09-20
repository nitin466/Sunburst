angular.module('app.directives', [])
.directive('sunburstGraph', function() {
  return {
    restrict: 'AE',
    scope: {
      data: "=",
      size: "="
    },
    templateUrl: 'templates/sunburstGraphTemplate.html',
    link: function($scope,$element,$attr) {
      dataValidate($scope.data);
      var width = 960,
          height = 700,
          radius = Math.min(width, height) / 2,
          color1 = d3.scale.category10(),
          color2 = d3.scale.category20(), 
          color3 = d3.scale.category20b(),
          color4 = d3.scale.category20c(),
          color = [color1, color2, color3, color4];

      var svg = d3.select("body").append("svg")
          .attr("width", width)
          .attr("height", height)
          .append("g")
          .attr("transform", "translate(" + width / 2 + "," + height * .52 + ")");

      var partition = d3.layout.partition()
          .sort(null)
          .size([2* Math.PI, radius * radius])
          .value(function(d) { return 1; });

      var arc = d3.svg.arc()
          .startAngle(function(d) { return d.x; })
          .endAngle(function(d) { return d.x + d.dx; })
          .innerRadius(function(d) { return Math.sqrt(d.y); })
          .outerRadius(function(d) { return Math.sqrt(d.y + d.dy); });

      var path = svg.datum($scope.data).selectAll("path")
          .data(partition.nodes)
        .enter().append("path")
          .attr("display", function(d) { return d.depth ? null : "none"; }) // hide inner ring
          .attr("d", arc)
          .style("stroke", "#fff")
          .style("fill", function(d) {
            if(d.depth === 0) {
              return color[d.depth](d.name);
            } else {
              return color[(d.depth) - 1](d.name);
            }
          })
          .style("fill-rule", "evenodd")
          .on("mouseover", mouseover)
          .on("mouseleave", mouseleave)
          .on("mousemove", mousemove)
          .each(stash);

      // Adding the change event of Count and Size check boxes.
      d3.selectAll("input.valueBox").on("change", change); 

      // Appending tooltip to the body
      var tooltip = d3.select("body").append("div")
          .attr("class", "tooltip");

      // Appending legend to the body
      var legend = d3.select("body").append("div")
          .attr("class", "legend")
          .style("width", "500px")
          .style("height", "400px")
          .style("color", "white");

      // Appending Details box to the body
      var Details = d3.select("body").append("div")
          .attr("class", "Details");

      // Show the details of root element in details box on page load
      showDetails("count",$scope.data.children);

      var Data = d3.select("body").append("div")
          .attr("class", "Data");

      // Stash the old values for transition.
      function stash(d) {
        d.x0 = d.x;
        d.dx0 = d.dx;
      }

      // Interpolate the arcs in data space.
      function arcTween(a) {
        var i = d3.interpolate({x: a.x0, dx: a.dx0}, a);
        return function(t) {
          var b = i(t);
          a.x0 = b.x;
          a.dx0 = b.dx;
          return arc(b);
        };
      }

      // Highlight hovered elements and show the parents of the highlighted element and show the the data in a tree structure adjacent to the Graph.
      function mouseover(d){

        var sequenceNodes = getAncestors(d);

        // Make elements other than hovered as Transparent
        d3.selectAll("path")
            .style("opacity", 0.2);

        // Add Highlighter on the hovered element
        d3.select(this)
            .classed("hover", true);

        d3.selectAll("path")
            .filter(function(node) {
              return (sequenceNodes.indexOf(node) >= 0);
            })
            .style("opacity", 1);

        tooltip.transition()
                .duration(3000)
                .style("display", "block");

        tooltip.html("<p> Name: <span class='tooltipName'>" + d.name + "</span></p><p> Total size: <span class='tooltipSize'>" + d.value + "</span></p>")
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY) + "px");

        legend.html(function() {
          var inside = "";
          for(var node in sequenceNodes){
            var no_children = sequenceNodes[node].children ? sequenceNodes[node].children.length : 0;
            inside += "<p style='background-color: #CCFF00; color: red; margin:0 0 0 " + (node * 50) + "px; padding: 5px 0 5px 5px;'> " + ((node === "0") ? "Root Element" : "Child Element no: " + node) + "</p><p style='background-color: #0099FF; margin:0 0 0 " + (node * 50) + "px; padding: 0 0 5px 5px;'> Name: " + sequenceNodes[node].name + "</p><p style='background-color: #0099FF; margin: 0 0 0 " + (node * 50) + "px; padding: 0 0 5px 5px;'> Total Size: " + sequenceNodes[node].value + "</p><p style='background-color: #0099FF; margin: 0 0 20px " + (node * 50) + "px; padding: 0 0 5px 5px;'> Number of children: " + no_children + "</p>"; 
          }

          return inside;

        });

      }

      // Restore everything to full opacity and hides the tree structure
      function mouseleave(d) {
        d3.selectAll("path")
            .style("opacity", 1);

        tooltip.transition()
                .duration(1000)
                .style("display", "none");

        d3.select(this)
            .classed("hover", false);

        legend.html("");
      }

      // Move the Tooltip along with the cursor
      function mousemove(d){
        tooltip.style("left", (d3.event.pageX) + "px").style("top", (d3.event.pageY) + "px");
      }

      // Changes the value to Size and Count on changing the selection of the checkBoxes.
      function change() {
        var value = this.value === "count"
            ? function() { return 1; }
            : function(d) { 
                if($scope.size === "size") return d.size;
                if($scope.size === "calories") return d.calories; 
              };

        Data.style("opacity", 0);

        path
            .data(partition.value(value).nodes)
          .transition()
            .duration(1500)
            .attrTween("d", arcTween);

        showDetails(this.value,$scope.data.children);

      };

      // Show the Details of the root element Below the graph
      function showDetails(value,elements) {

        var detailedHtml = "<h1 style='font-size: 14px; font-weight: 800;'>Distribution by Ratings</h1><hr class='details'>",
            // totalBarLength = 0,
            barLength = 0,
            percentage = 0,
            barLengths = [];

        // closure to get barLength
        var getTotalBarLength = (function() {
          var totalBarLength = 0;
          return function(barlngth) {
            totalBarLength += barlngth;
            return totalBarLength;
          }
        })();            

        for(var root in elements) {
          if(value === "count") {
            barLength = (elements[root].children.length * 6);
          } else {
            barLength = (elements[root].value/2000);
          }
          barLengths.push(barLength);
          getTotalBarLength(barLength);
          detailedHtml += "<div class='row'><div class='col-md-2'><p class='details'>" + elements[root].name + "(" + elements[root].children.length + ")</p></div><div class='col-md-6'><div class='details' style=' background-color:" +  color1(elements[root].name) + ";'></div></div><div class='col-md-2'><p class='details percentage'></p></div><div class='col-md-2'><a class='view-data' style='cursor: pointer;' >view</a></div></div><hr class='details'>";
        }


        Details.html(detailedHtml)
                .style("opacity", 0)
                .transition()
                .delay(1000)
                .duration(1500)
                .style("opacity", 1);

        d3.selectAll("div.details")
            .data(barLengths)
            .transition()
            .delay(2500)
            .duration(1500)
            .style("width", function(d) {
              return d + "px";
            });

        d3.selectAll("p.percentage")
            .data(barLengths)
            .text(function(d) {
              percentage = ((d/getTotalBarLength(0)) * 100).toFixed(2);
              return percentage + "%";
            });

        d3.selectAll("a.view-data")
          .data(elements)
          .on("click", showData);

      }

      // Get all the ancestors of the given node
      function getAncestors(node) {
        var path = [];
        var current = node;
        while(current.parent) {
          path.unshift(current);
          current = current.parent;
        }
        return path;
      }

      // Displays all the child node of the given parent node
      function showData(d) {

        var childrenHtml = "",
            previousHtml = "";

        if(d.parent.parent) {
          previousHtml = "<p style=' margin: 0;'><a class='view-previous' style='cursor: pointer;'>Previous</a></p>";
        } else {
          previousHtml = "<p style=' margin: 0;'><a class='view-previous' style='cursor: pointer; display: none;' >Previous</a></p>";
        }


        var dataHtml = "<div class='row'><div class='col-md-10'><h1 style='font-size: 14px; font-weight: 800; margin-top: 0;'>Viewing children with parent: " + d.name + "</h1></div><div class='col-md-2'>" + previousHtml + "</div></div><hr class='details'>";
        
        
        for(var element in d.children) {
          if(d.children[element].children) {
            childrenHtml = "<a class='view-children' style='cursor: pointer;' >Children</a>";
          } else {
            childrenHtml = "<a class='view-children' style='cursor: pointer; display: none;' >Children</a>";
          }
          dataHtml += "<div class='row'><div class='col-md-10'><p style='color: #CC6600'>" + d.children[element].name + "</p></div><div class='col-md-2'>" + childrenHtml + "</div></div><hr class='details'>";
        }

        Data.html(dataHtml)
            .style("display","block")
            .style("opacity",0)
            .transition()
            .duration(1500)
            .style("opacity",1);

        d3.selectAll("a.view-previous")
            .on("click", function() { showData(d.parent)});

        d3.selectAll("a.view-children")
            .data(d.children)
            .on("click", showData);
      }

      // Function for Data Validation
      function dataValidate(data) {
        if( data === null || data === "") {
          alert("Data is not valid");
        } else {
          alert("Data is valid");
        }
      }

      d3.select(self.frameElement).style("height", height + "px");
    }
  };
});