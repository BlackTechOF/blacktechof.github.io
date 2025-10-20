async function verificarUsername() {
  const token = localStorage.getItem('token');
  const inputUpdateUsername = document.getElementById('inputUpdateUsername');
  const username = inputUpdateUsername.value.trim();

  try {
    const resVerificar = await fetch('https://backend-blacktech.onrender.com/check-username', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ username })
    });

    const dataVerificar = await resVerificar.json();

    if (!dataVerificar.permitido) {
      console.log('inapropriado');
      alert('Nome de usuário inapropriado');
      return false;
    }

    console.log('aceito')
    return true;
  }  catch (error) {
    console.error('Erro na verificação/atualização:', error);
    alert('Erro inesperado ao verificar nome de usuario.');
  }
}

   async function updateUsername() {
    const token = localStorage.getItem('token');
  const inputUpdateUsername = document.getElementById('inputUpdateUsername');
  const username = inputUpdateUsername.value.trim();
    try {
      const permitido = await verificarUsername(username)
      if (permitido) {
           const resUpdate = await fetch('https://backend-blacktech.onrender.com/user/username', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ username })
    });

    const dataUpdate = await resUpdate.json();

    if (resUpdate.ok) {
      alert('Nome de usuário atualizado com sucesso!');
    } else {
      alert('Erro: ' + (dataUpdate.error || 'Não foi possível atualizar o nome de usuário.'));
    }
  } else {
    alert('falha na atualizaçao de usuario')
  }
    } catch(error) {
       alert("faha na atualizaçao")
    }
   }