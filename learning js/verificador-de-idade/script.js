function verificar() {
    var data = new Date();
    var ano = data.getFullYear();
    var fano = document.getElementById('ano');
    var res = document.getElementById('res');
    var fsex = document.getElementsByName('sex');

    if (fano.value.length == 0 || Number(fano.value) > ano || Number(fano.value) <= 0 || !fsex[0].checked && !fsex[1].checked) {
        window.alert('[ERRO] Verifique os dados e tente novamente!');   
    } else {
        var idade = ano - Number(fano.value);
        var genero;
        var img = document.createElement('img');
        img.setAttribute('id', 'foto');
        if (fsex[0].checked) {
            genero = 'Homem'
            if (idade >= 0 && idade <= 3) {
                res.innerHTML = `Detectamos um ${genero} bebê com ${idade} anos.`;
                img.setAttribute('src', 'img/bebe-masc.webp')
            } else if (idade <= 11) {
                res.innerHTML = `Detectamos um ${genero} criança com ${idade} anos.`;
                img.setAttribute('src', 'img/menino.webp')
            } else if (idade <= 18) {
                res.innerHTML = `Detectamos um ${genero} adolescente com ${idade} anos.`;
                img.setAttribute('src', 'img/adolesc-masc.webp')
            } else if (idade <= 50) {
                res.innerHTML = `Detectamos um ${genero} adulto com ${idade} anos.`;
                img.setAttribute('src', 'img/adulto-masc.webp')
            } else if (idade <= 100) {
                res.innerHTML = `Detectamos um ${genero} idoso com ${idade} anos.`;
                img.setAttribute('src', 'img/idoso.webp')
            } else {
                res.innerHTML = `Detectamos um ${genero} com ${idade} anos (Provavelmente essa pessoa está morta).`;
                img.setAttribute('src', 'img/morto.webp')
            }
        } else if (fsex[1].checked) {
            genero = 'Mulher';
            if (idade >= 0 && idade <= 3) {
                res.innerHTML = `Detectamos uma ${genero} bebê com ${idade} anos.`;
                img.setAttribute('src', 'img/bebe-fem.webp')
            } else if (idade <= 11) {
                res.innerHTML = `Detectamos uma ${genero} criança com ${idade} anos.`;
                img.setAttribute('src', 'img/menina.webp')
            } else if (idade <= 18) {
                res.innerHTML = `Detectamos uma ${genero} adolescente com ${idade} anos.`;
                img.setAttribute('src', 'img/adole-fem.webp')
            } else if (idade <= 50) {
                res.innerHTML = `Detectamos uma ${genero} adulta com ${idade} anos.`;
                img.setAttribute('src', 'img/adulto-fem.webp')
            } else if (idade <= 100) {
                res.innerHTML = `Detectamos uma ${genero} idosa com ${idade} anos.`;
                img.setAttribute('src', 'img/idosa.webp')
            } else {
                res.innerHTML = `Detectamos uma ${genero} com ${idade} anos (Provavelmente essa pessoa está morta).`;
                img.setAttribute('src', 'img/morto.webp')
            }
        }

        res.style.textAlign = 'center';
        res.appendChild(img)
    }
}