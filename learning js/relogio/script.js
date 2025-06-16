function carregar() {
    var msg = document.getElementById('msg')
    var img = document.getElementById('img')
    var data = new Date()
    var hora = data.getHours()
    var minutos = data.getMinutes()

    if (hora >= 0 && hora < 4) {
        document.body.style.backgroundColor = '#000b35'
        msg.innerHTML = `Agora são ${hora} horas e ${minutos} minutos da madrugada.`
        img.src = 'img/madrugada.png'        
    } else if (hora >= 4 && hora < 12) {
        document.body.style.backgroundColor = '#9fcbff'
        msg.innerHTML = `Agora são ${hora} horas e ${minutos} minutos da manhã.`
        img.src = 'img/manha.png'
    } else if (hora >= 12 && hora < 18) {
        document.body.style.backgroundColor = '#ffb83b'
        msg.innerHTML = `Agora são ${hora} horas e ${minutos} minutos da tarde.`
        img.src = 'img/tarde.png'
    } else {
        document.body.style.backgroundColor = '#001460'
        msg.innerHTML = `Agora são ${hora} horas e ${minutos} minutos da noite.`
        img.src = 'img/noite.png'
    }
}