import express from "express";
import sql from "./database.js";
import bcrypt from "bcrypt";

const routes = express.Router();


routes.get('/Usuarios', async (req, res) => {
    try {
        const usuarios = await sql`SELECT email FROM Cadastrar`;
        return res.status(200).json(usuarios);
    } catch (error) {
        console.error("Erro ao buscar usuários:", error);
        return res.status(500).json({ message: 'Erro ao buscar usuários', error });
    }
});


routes.post('/Cadastrar', async (req, res) => {
    const { nome, email, senha } = req.body;

    // Validação de campos obrigatórios
    if (!nome || !email || !senha) {
        return res.status(400).json({ message: "Todos os campos são obrigatórios." });
    }

    // Validação de senha forte
    const senhaRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
    if (!senhaRegex.test(senha)) {
        return res.status(400).json({
            message: "Senha fraca! Ela deve ter letras maiúsculas, minúsculas, número e caractere especial, mínimo 6 caracteres."
        });
    }

    try {
        // Verifica se o email já existe
        const existente = await sql`SELECT * FROM Cadastrar WHERE email = ${email}`;
        if (existente.length > 0) {
            return res.status(409).json({ message: "Email já cadastrado!" });
        }

        // Criptografa a senha
        const senhaCriptografada = await bcrypt.hash(senha, 10);

        // Insere no banco
        await sql`
            INSERT INTO Cadastrar (nome, email, senha)
            VALUES (${nome}, ${email}, ${senhaCriptografada})
        `;

        return res.status(201).json({ message: "Usuário cadastrado com sucesso!" });
    } catch (error) {
        console.error("Erro ao cadastrar:", error);
        return res.status(500).json({ message: "Erro ao cadastrar usuário", error });
    }
});


routes.post('/Login', async (req, res) => {
    const { email, senha } = req.body;
    try {
        const resultado = await sql`SELECT * FROM Cadastrar WHERE email = ${email}`;
        if (resultado.length === 0) return res.status(401).json({ message: 'Email não encontrado' });

        const usuario = resultado[0];
        const senhaValida = await bcrypt.compare(senha, usuario.senha);

        if (!senhaValida) return res.status(401).json({ message: 'Senha incorreta' });

        // Retorna dados do usuário + id para o frontend salvar no localStorage
        return res.status(200).json({
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            foto: usuario.foto || null
        });
    } catch (error) {
        console.error("Erro no login:", error);
        return res.status(500).json({ message: 'Erro ao realizar login', error });
    }
});




routes.post("/Comunidade/Mensagem", async (req, res) => {
    const { usuario_id, usuario_nome, mensagem, data } = req.body;

    if (!usuario_id || !usuario_nome || !mensagem) {
        return res.status(400).json({ message: "Usuário, nome e mensagem são obrigatórios." });
    }

    try {
        await sql`
      INSERT INTO mensagens_comunidade (usuario_id, usuario_nome, mensagem, data)
      VALUES (${usuario_id}, ${usuario_nome}, ${mensagem}, ${data || new Date().toISOString()})
    `;

        return res.status(201).json({ message: "Mensagem enviada com sucesso!" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro ao enviar mensagem", error });
    }
});


routes.put("/Perfil/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, foto, senha } = req.body;

  if (!nome ) {
    return res.status(400).json({ success: false, message: "Nome é obrigatório." });
  }

  try {
    if (senha && senha.trim() !== "") {
      // Se o usuário digitou nova senha → criptografa e atualiza tudo
      const senhaCriptografada = await bcrypt.hash(senha, 10);

      await sql`
        UPDATE Cadastrar
        SET nome = ${nome},
            foto = ${foto || null},
            senha = ${senhaCriptografada},
            atualizado_em = ${new Date().toISOString()}
        WHERE id = ${id};
      `;
    } else {
      // Se o usuário NÃO digitou nova senha → mantém a senha antiga
      await sql`
        UPDATE Cadastrar
        SET nome = ${nome},
            foto = ${foto || null},
            atualizado_em = ${new Date().toISOString()}
        WHERE id = ${id};
      `;
    }

    return res.status(200).json({ success: true, message: "Perfil atualizado com sucesso!" });
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);
    return res.status(500).json({ success: false, message: "Erro ao atualizar perfil", error });
  }
});



routes.get("/Comunidade/Mensagem", async (req, res) => {
    try {
        const mensagens = await sql`
      SELECT * FROM mensagens_comunidade
      ORDER BY data ASC
    `;

        setTimeout(() => {
            res.status(200).json(mensagens);
        }, 1000);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erro ao buscar mensagens", error });
    }
});

routes.get("/Perfil/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const resultado = await sql`
      SELECT id, nome, email, foto 
      FROM Cadastrar 
      WHERE id = ${id};
    `;

        if (resultado.length === 0) {
            return res.status(404).json({ success: false, message: "Usuário não encontrado." });
        }

        return res.status(200).json(resultado[0]);
    } catch (error) {
        console.error("Erro ao buscar perfil:", error);
        return res.status(500).json({ success: false, message: "Erro ao buscar perfil", error });
    }
});


routes.get("/Comunidade/Mensagem/:usuario_id", async (req, res) => {
    const { usuario_id } = req.params;

    try {
        const mensagens = await sql`
      SELECT * FROM mensagens_comunidade
      WHERE usuario_id = ${usuario_id}
      ORDER BY data ASC
    `;

        res.status(200).json(mensagens);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erro ao buscar mensagens do usuário", error });
    }
});


routes.get("/Notas/:usuario_id", async (req, res) => {
    const { usuario_id } = req.params;

    try {
        const notas = await sql`
            SELECT * FROM Notas 
            WHERE usuario_id = ${usuario_id}
            ORDER BY data_criacao DESC
        `;
        return res.status(200).json(notas);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro ao buscar notas", error });
    }
});


routes.post("/Notas", async (req, res) => {
    const { usuario_id, conteudo } = req.body;

    if (!usuario_id) {
        return res.status(400).json({ message: "Usuário e conteúdo são obrigatórios." });
    }

    try {
        const dataAtual = new Date().toISOString();

        const result = await sql`
            INSERT INTO notas(usuario_id, conteudo, data_criacao, data_atualizacao)
            VALUES(${usuario_id}, ${conteudo}, ${dataAtual}, ${dataAtual})
            RETURNING *;
        `;

        // Retorna a nota criada
        return res.status(201).json(result[0]);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro ao criar nota", error });
    }
});


routes.put("/Notas/:id", async (req, res) => {
    const { id } = req.params;
    const { conteudo } = req.body;

    if (conteudo === undefined || conteudo === null) {
        return res.status(400).json({ message: "O conteúdo da nota é obrigatório." });
    }

    try {
        await sql`
            UPDATE Notas 
            SET conteudo = ${conteudo}, data_atualizacao = ${new Date().toISOString()}
            WHERE id = ${id}
        `;

        return res.status(200).json({ message: "Nota atualizada com sucesso!" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro ao atualizar nota", error });
    }
});

routes.delete("/Notas/:id", async (req, res) => {
    const { id } = req.params;

    try {
        await sql`
            DELETE FROM Notas WHERE id = ${id}
        `;

        return res.status(200).json({ message: "Nota excluída com sucesso!" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro ao excluir nota", error });
    }
});


export default routes;



