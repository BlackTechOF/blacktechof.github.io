const API_URL = 'http://localhost:3000';

const inputEmail = document.getElementById('userEmailInput')
const inputId = document.getElementById('userIdInput')
const dataSection = document.querySelector('.data')
const dataBanSection = document.querySelector('.data-ban')
const dataOptions = document.querySelector('.dataOptions')
const btnDeleteUser = document.getElementById('deleteUser');

async function verifyAdmin() {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/user/get-data-user`, {
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

            const res = await fetch(`${API_URL}/admin/get-dados`, {
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
            dataBanSection.style.display = ''

            const data = await res.json()

            console.log(data.role)
            const rolesvg = await returnRolesSVg(data.role)

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
             
             <div class='data-ban-btns'>
             <button id="unban-user" onclick='unbanUser()'>Desbanir</button>
             <button id="reset-warn" onclick='clearUser()'>Limpar Avisos</button>
             <button id="ban" onclick='banUser()'>Banir</button>
             </div>
            `

        } catch (error) {
            console.error(error)
            alert('erro')
        }
    }
}


const rolesButtons = document.querySelectorAll('#rolesDiv .btnRole');

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

                const res = await fetch(`${API_URL}/admin/change-roles`, {
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
});

async function deleteOneUser() {
    console.log("funcao deleteoneuser chamada")
    const token = localStorage.getItem('token')

    try {

        const email = document.getElementById('userEmailInput')?.value.trim();
    const userId = document.getElementById('userIdInput')?.value.trim();

        if (!email && !userId) {
            alert('Insira um ID ou Email válido!')
            return;
        }

        const permitido = await verifyAdmin();

        if (!permitido) {
            return;
        }

        let body;

        if (email) {
            body = { email }
            console.log('email')
        } else if (userId) {
            body = { userId }
            console.log('id')
        } else {
            body = null
            console.log('nulo')
        }

        const res = await fetch(`${API_URL}/admin/delete-one-user`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();

        if (!res.ok) {
            alert(`Erro, ${data}`)
            return;
        }

        alert(`Usuário ${email || userId}, Deletado com sucesso`);
    } catch (error) {
        console.error(error)
        alert('error 500');
    }
}

async function removeToken() {
    const email = document.getElementById('userEmailInput')?.value.trim();
    const userId = document.getElementById('userIdInput')?.value.trim();
    const token = localStorage.getItem('token')

    try {
        let body;

        body = email? {email} : {userId}

        const res = await fetch(`${API_URL}/admin/remove-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`           
            },
            body: JSON.stringify( body )
        });

        const data = await res.json()

        if (!res.ok) {
            return alert(data.error);
        }

        alert(data.message);
    } catch (error) {
        console.error(error)
    }
}

async function deleteChats() {
    const email = document.getElementById('userEmailInput')?.value.trim();
    const userId = document.getElementById('userIdInput')?.value.trim();
    const token = localStorage.getItem('token')

    try {
        let body;

        body = email ? {email} : {userId}

        const res = await fetch(`${API_URL}/admin/delete-chats`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        })

        const data = await res.json()

        if (!res.ok) {
            return alert(data.error);
        }

        alert(data.message);
    } catch (error) {
        console.error(error)
    }
}

async function banUser() {
    const email = document.getElementById('userEmailInput')?.value.trim();
    const userId = document.getElementById('userIdInput')?.value.trim();
    const token = localStorage.getItem('token')

    try {
        let body;

        body = email ? {email} : {userId}

        const res = await fetch(`${API_URL}/admin/ban-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        const data = await res.json()

        if (!res.ok) {
            return alert(data.error);
        }

        alert(data.message)
    } catch (error) {
        console.error(error)
    }
};

async function unbanUser() {
    const email = document.getElementById('userEmailInput')?.value.trim();
    const userId = document.getElementById('userIdInput')?.value.trim();
    const token = localStorage.getItem('token')

    try {
        let body;

        body = email ? {email} : {userId}

        const res = await fetch(`${API_URL}/admin/unban-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        const data = await res.json()

        if (!res.ok) {
            return alert(data.error);
        }

        alert(data.message)
    } catch (error) {
        console.error(error)
    }
};

async function clearUser() {
    const email = document.getElementById('userEmailInput')?.value.trim();
    const userId = document.getElementById('userIdInput')?.value.trim();
    const token = localStorage.getItem('token')

    try {
        let body;

        body = email ? {email} : {userId}

        const res = await fetch(`${API_URL}/admin/clear-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        const data = await res.json()

        if (!res.ok) {
            return alert(data.error);
        }

        alert(data.message)
    } catch (error) {
        console.error(error)
    }
};

inputEmail.addEventListener('keydown', async function (e) {
    if (e.key === 'Enter') {
        await getDados()
    }
});

inputId.addEventListener('keydown', async function (e) {
    if (e.key === 'Enter') {
        await getDados()
    }
});

window.onload = async function () {
    const permitido = await verifyAdmin()

    if (permitido) {
        console.log('Admin detectado')
    } else {
        window.location.href = 'techia.html'
    }
}



