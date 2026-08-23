CALUDE - Uber Gastos
=====================

Resumo
------
Projeto simples de controle de despesas do grupo (HTML/CSS/JS estático).

Como rodar localmente
---------------------

1. No terminal, a partir da raiz do projeto, rode (exemplo porta 8080):

```powershell
python -m http.server 8080 --directory "C:\Users\gusta\source\repos\Uber"
```

2. Abra no navegador: http://localhost:8080/

Notas de desenvolvimento
------------------------
- Arquivos principais: `index.html`, `style.css`, `script.js`.
- Para testes mobile: abra DevTools e habilite o modo aparelho (Toggle device toolbar).

Alterações recentes
-------------------
- Removido toggle duplicado dentro do painel de formulário (corrigido em `script.js`).

Como testar rapidamente
----------------------
- Verifique se ao abrir em largura <= 640px apenas um botão "Nova despesa" aparece.
- Salve/edite/exclua itens usando o formulário e a tabela para validar comportamento.

Observações
-----------
- Este projeto é servido como arquivos estáticos; qualquer servidor HTTP estático funciona.
- Se um outro serviço estiver rodando na mesma porta, escolha uma porta diferente (ex.: 8080).

Contato
-------
Projeto gerado localmente pelo desenvolvedor.
