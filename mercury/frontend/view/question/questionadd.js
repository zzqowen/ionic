$(function() {
    $("[name=submit]").on("click", function() {
        var datas = $("#fontSubmit").serialize();
        $.post("/question/add", datas, function(data) {
            if(data.status == "ok") window.location.href = "/question/view/list.html";
            else alert(data.status);
        });
    });

    $("[name=next]").on("click", function() {
        var datas = $("#fontSubmit").serialize();
        $.post("/question/add", datas, function(data) {
            if(data.status == "ok") window.location.reload();
            else alert(data.status);
        });
    });
})

