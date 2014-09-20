angular.module('myApp')
  .directive('sunburstDirective', function() {
    
    return {
      restrict: 'E',
      scope: {
        data: "=" 
      },

      link: function(scope, elm, attrs) {


        var width = 600,
          height = 700,
          radius = Math.min(width, height) / 2;

        var x = d3.scale.linear()
          .range([0, 2 * Math.PI]);

        var y = d3.scale.sqrt()
          .range([0, radius]);

        var color = d3.scale.category20b();

        var svg = d3.select("#body").append("svg")
          .attr("width", width)
          .attr("height", height)
          .append("g")
          .attr("transform", "translate(" + width / 2 + "," + (height / 2 + 10) + ")");

        var partition = d3.layout.partition()
          .value(function(d) {
            return d.value;
          });

        var arc = d3.svg.arc()
          .startAngle(function(d) {
            return Math.max(0, Math.min(2 * Math.PI, x(d.x)));
          })
          .endAngle(function(d) {
            return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx)));
          })
          .innerRadius(function(d) {
            return Math.max(0, y(d.y));
          })
          .outerRadius(function(d) {
            return Math.max(0, y(d.y + d.dy));
          });



        var tooltip = d3.select("#body")
          .append("div")
          .attr("class", "tooltip")
          .style("position", "absolute")
          .style("z-index", "10")
          .style("opacity", 0);


        var firstChild = d3.select("body")
          .append("div")
          .attr("class", "firstChild");

          
        var secondChild = d3.select("body")
          .append("div")
          .attr("class", "secondChild");


        //dataForFirstChild(scope.data); //called on pageload


        function format_number(x) {
          return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }


        function format_name(d) {
          var name = d.name;
          return  '<b>' + name + '</b><br> (' + format_number(d.value) + ')';
        }


        //d3.json("newData.json", function(error, root) {

        var path = svg.selectAll("path")
          .data(partition.nodes(scope.data))
          .enter().append("path")
          .attr("d", arc)
          .attr("fill-rule", "evenodd")
          .style("fill", function(d) {
            return color((d.children ? d : d).name);
          })
          .on("click", click)
          .on("mouseover", function(d) {
            tooltip.html(function() {
              var name = format_name(d);
              return name;
            });
            return tooltip.transition()
              .duration(50)
              .style("opacity", 0.8);
          })
          .on("mousemove", function(d) {
            return tooltip
              .style("top", (d3.event.pageY - 20) + "px")
              .style("left", (d3.event.pageX + 20) + "px");
          })
          .on("mouseout", function() {
            return tooltip.style("opacity", 0);
          });


        // var pathView = firstChild.selectAll("a.viewClass")
        // .data(partition.nodes(scope.data))
        // .enter().append("pathView")
        // .on("click", dataForSecondChild);

        function click(d) {
          console.log("click called", d);
          //getAncestors(d);
          // dataForFirstChild(d);
          //var i = 0;
          path.transition()
            .duration(750)
            .attrTween("d", arcTween(d));
            dataForFirstChild(d);
          //dataForSecondChild(d, 2);
        }


        function getAncestors(node) {
          console.log("Ancestor:", node);
          //var path = [];
          var firstNodes = [];
          for(var item in node.children) {
            firstNodes.push(node.children[item]) ;
          }
          
          return firstNodes;
        }


        function dataForFirstChild(d) {
          
         console.log(d.children);
         var id = [];
         var htmlString = '';
         //firstChild.html(htmlString);
         for( var x in d.children) {
           id.push(d.children[x]);
           var res = getPercentage(d.value, id[x].value);
           percentageRes = res.toFixed(2);
           // console.log(percentageRes);
            htmlString += '<div class = "row chart "> <div class = "col-lg-2 col-md-2 col-xs-2"> <p>'  +  id[x].name + ' (' + id[x].value + ')' + ' </p> </div> <div class ="col-lg-5 col-md-5 col-xs-5 "> <div style="background-color:'  + color(id[x].name) + '; width: ' + (percentageRes*3) +'px; "></div></div><div class="col-lg-1 col-md-1 col-xs-1"> <p> ' + percentageRes + '%</p> </div> <div class="col-lg-2 col-md-2 col-xs-2"> <div class="viewClass"><a class = "viewClass">View </a></div> </div></div>';
          }

          firstChild.html(htmlString);

          d3.selectAll("a.viewClass")
           .data(d.children)
           .on("click", dataForSecondChild);
        }


        function dataForSecondChild(d) {
          console.log("secondChildFunction called", d);
          var secChild = [];
          htmlString2 = '';
          secChild = d.children;
          console.log(secChild);

          for( var i in secChild ) {
            console.log(secChild[i].name);
            htmlString2 += '<div class="secChart">' + secChild[i].name + ' ' +secChild[i].value +'</div>';
          }
          secondChild.html(htmlString2);

        }



           // To calculate percentage 
        function getPercentage(a, b) {
          var percentageValue = (b/a)*100;
          return percentageValue;
         }
    
        

          // var newHtml2 = '<div class= "chart">' + htmlString2 + '</div>';
          // secondChild.html(newHtml2);
        

        d3.select(self.frameElement).style("height", height + "px");

        
        // Interpolate the scales!
        function arcTween(d) {
          var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
            yd = d3.interpolate(y.domain(), [d.y, 1]),
            yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
          return function(d, i) {
            return i ? function(t) {
              return arc(d);
            }
            : function(t) {
              x.domain(xd(t));
              y.domain(yd(t)).range(yr(t));
              return arc(d);
            };
          };
        }

      }
    };
  });