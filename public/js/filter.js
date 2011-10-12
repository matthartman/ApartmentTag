$(function(){
	       
   $(".listing")
        .css("opacity","0.8")
       .hover(function(){
           $(this).css("opacity","1");
       }, function() {
           $(this).css("opacity","0.8");
       })
       
   $("#allcat").click(function(){
       $(".listing").slideDown();
	   $(".themap").slideUp();
       $("#catpicker a").removeClass("current");
       $(this).addClass("current");
       return false;
   });
   
   $(".filter").click(function(){
        var thisFilter = $(this).attr("id");
        $(".listing").slideUp();
        $("."+ thisFilter).slideDown();
        $("#catpicker a").removeClass("current");
        $(this).addClass("current");
        return false;
   });


});