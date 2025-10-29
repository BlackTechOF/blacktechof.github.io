const inputEmail = document.getElementById('userEmailInput')
const inputId = document.getElementById('userIdInput')
const dataSection = document.querySelector('.data')
const dataBanSection = document.querySelector('.data-ban')
const dataOptions = document.querySelector('.dataOptions')

async function verifyAdmin() {
    const token = localStorage.getItem('token');
    const res = await fetch('http://localhost:3000/get-data-user', {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
    });

    const data = await res.json()

    if (!res.ok) {
        return alert('erro ao coletar dados do usuario');
    }

    if (data.role !== 'admin') {
        alert('voce nao é adm')
        return false;
    } else {
        return true;
    }
};

async function getDados() {
    const token = localStorage.getItem('token')

    const permitido = await verifyAdmin()

    if (permitido) {
        console.log('Admin detectado')
        try {
            const email = document.getElementById('userEmailInput').value;
            const idUser = document.getElementById('userIdInput').value;

            let body;

            if (email) {
                body = { email }
            } else if (idUser) {
                body = { idUser }
            } else {
                alert('Preencha o email ou ID antes de atualizar o cargo');
            }

            const res = await fetch('http://localhost:3000/get-dados', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                alert('Erro ao coletar dados de usuario (Front)')
                return;
            }

            dataSection.style.display = ''
            dataBanSection.style.display =''

            const data = await res.json()
            const rolesvg = await returnRolesSVg()

            dataSection.innerHTML = `
        <p><strong>User:</strong> ${data.username}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p id='dataId'><strong>ID:</strong><strong id='partId'>${data._id}</strong><button id='copiarId'><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
<path d="M8 5.00005C7.01165 5.00082 6.49359 5.01338 6.09202 5.21799C5.71569 5.40973 5.40973 5.71569 5.21799 6.09202C5 6.51984 5 7.07989 5 8.2V17.8C5 18.9201 5 19.4802 5.21799 19.908C5.40973 20.2843 5.71569 20.5903 6.09202 20.782C6.51984 21 7.07989 21 8.2 21H15.8C16.9201 21 17.4802 21 17.908 20.782C18.2843 20.5903 18.5903 20.2843 18.782 19.908C19 19.4802 19 18.9201 19 17.8V8.2C19 7.07989 19 6.51984 18.782 6.09202C18.5903 5.71569 18.2843 5.40973 17.908 5.21799C17.5064 5.01338 16.9884 5.00082 16 5.00005M8 5.00005V7H16V5.00005M8 5.00005V4.70711C8 4.25435 8.17986 3.82014 8.5 3.5C8.82014 3.17986 9.25435 3 9.70711 3H14.2929C14.7456 3 15.1799 3.17986 15.5 3.5C15.8201 3.82014 16 4.25435 16 4.70711V5.00005" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg></button></p>
        <p id='role'><strong>Permissões:</strong> <button>${rolesvg}</button></p>
        `

            document.getElementById('copiarId').addEventListener('click', async () => {
                const texto = document.getElementById('partId').textContent;

                try {
                    await navigator.clipboard.writeText(texto);
                    alert('Texto copiado com sucesso!');
                } catch (err) {
                    console.error('Erro ao copiar: ', err);
                }
            });

            dataBanSection.innerHTML = `
             <p><strong>Avisos total:</strong> ${data.warn}</p>
             <p><strong>Tokens total:</strong> ${data.TokenVersion}</p>
             <p><strong>Banimentos:</strong> ${data.totalban}</p>

            `

        } catch (error) {
            console.error(error)
            alert('erro')
        }
    }
}


const rolesButtons = document.querySelectorAll('#rolesDiv .btnRole');

const roleAdmin = document.getElementById('roleAdmin').value = 'admin'

const roleTester = document.getElementById('roleTester').value = 'tester'

const roleUser = document.getElementById('roleUser').value = 'user'

rolesButtons.forEach(btn => {
    btn.addEventListener('click', async function () {
        const token = localStorage.getItem('token')

        const permitido = await verifyAdmin()

        if (permitido) {
            console.log('Adm permitido pra mudança de cargo');

            try {
                const email = document.getElementById('userEmailInput')?.value.trim();
                const idUser = document.getElementById('userIdInput')?.value.trim();
                const role = btn.value;

                if (!email && !idUser) {
                    alert('Insira um email ou ID valido de um usuário para mudar as permissões')
                    return;
                }

                let body;

                if (email) {
                    body = { email, role }
                } else if (idUser) {
                    body = { idUser, role }
                } else {
                    body = null
                }

                const res = await fetch('http://localhost:3000/change-roles', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(body),
                });

                const data = await res.json()

                if (!res.ok) {
                    console.error('Erro na API', data)
                    alert(`Erro: ${data.message} || Falha ao atualizar o cargo`)
                    return;
                }

                if (email) {
                    alert(`Cargo do usuário ${email} atualizado com sucesso para ${role}`)
                } else if (idUser) {
                    alert(`Cargo do usuário ${idUser} atualizado com sucesso para ${role}`)
                }
                console.log(data);
            } catch (error) {
                console.error(error)
                alert('Erro na autenticação com o servidor');
            }
        }
    })
})
inputEmail.addEventListener('keydown', async function (e) {
    if (e.key === 'Enter') {
        await getDados()
    }
});

inputId.addEventListener('keydown', async function (e) {
    if (e.key === 'Enter') {
        await getDados()
    }
})

function optionsSection() {
    dataOptions.style.display = ''
    dataSection.style.display = 'none'
}

function dadosSection() {
    dataOptions.style.display = 'none'
    dataSection.style.display = ''
}

window.onload = async function () {
  const permitido = await verifyAdmin()

  if (permitido) {
    console.log('Admin detectado')
  } else {
    window.location.href = 'techia.html'
  }
}



