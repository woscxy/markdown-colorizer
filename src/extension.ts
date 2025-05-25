import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    // 定义不同级别标题的装饰类型
    const headingDecorations: { [key: string]: vscode.TextEditorDecorationType } = {
        '1': vscode.window.createTextEditorDecorationType({ 
            color: '#330033', 
            fontWeight: 'bold'
        }), // 一级标题：深紫色
        '2': vscode.window.createTextEditorDecorationType({ 
            color: '#800080', 
            fontWeight: 'bold'
        }), // 二级标题：紫色
        '3': vscode.window.createTextEditorDecorationType({ 
            color: '#0033CC', 
            fontWeight: 'bold'
        }), // 三级标题：淡蓝色
        '4': vscode.window.createTextEditorDecorationType({ 
            color: '#0066FF', 
            fontWeight: 'bold' 
        })  // 四级标题：最淡蓝色
    };

    // 定义代码块的装饰类型
    const codeBlockDecoration = vscode.window.createTextEditorDecorationType({ 
        color: '#6A8759'  // 绿色（与引用块相同的颜色）
    });

    // 定义代码块内标题样式行的装饰类型
    const codeBlockHeadingDecoration = vscode.window.createTextEditorDecorationType({
        color: '#808080' // 灰色
    });

    // 定义其他常用Markdown格式的装饰类型
    const boldTextDecoration = vscode.window.createTextEditorDecorationType({ 
        color: '#D14', 
        fontWeight: 'bold' 
    }); // 粗体文本：深红色

    // 定义链接的装饰类型
    const linkDecoration = vscode.window.createTextEditorDecorationType({ 
        color: '#6A5ACD', 
        textDecoration: 'underline' 
    }); // 链接：紫色带下划线

    // 定义引用块的装饰类型
    const blockquoteDecoration = vscode.window.createTextEditorDecorationType({ 
        color: '#6A8759' 
    }); // 引用块：绿色

    // 定义列表项的装饰类型
    const listItemDecoration = vscode.window.createTextEditorDecorationType({ 
        color: '#CC7832' 
    }); // 列表项：橙色

    // 定义以"-"开头的列表项的装饰类型（浅绿色）
    const dashListItemDecoration = vscode.window.createTextEditorDecorationType({ 
        color: '#6A8759' 
    }); // 以"-"开头的列表项：浅绿色

    // 当切换编辑器时更新装饰
    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor && editor.document.languageId === 'markdown') {
            updateDecorations(editor);
        }
    }, null, context.subscriptions);

    // 当文档内容更改时更新装饰
    vscode.workspace.onDidChangeTextDocument(event => {
        const editor = vscode.window.activeTextEditor;
        if (editor && event.document === editor.document) {
            updateDecorations(editor);
        }
    }, null, context.subscriptions);

    // 更新装饰的函数
    function updateDecorations(editor: vscode.TextEditor) {
        const text = editor.document.getText();
        const headingRanges: { [key: string]: vscode.Range[] } = {
            '1': [], '2': [], '3': [], '4': []
        };
        const codeBlockContentRanges: vscode.Range[] = []; // 用于isInCodeBlock函数
        const codeBlockHeadingRanges: vscode.Range[] = []; // 代码块内标题样式行的范围
        const codeBlockNonHeadingRanges: vscode.Range[] = []; // 代码块内非标题行的范围
        const boldTextRanges: vscode.Range[] = [];
        const linkRanges: vscode.Range[] = [];
        const blockquoteRanges: vscode.Range[] = [];
        const listItemRanges: vscode.Range[] = [];
        const dashListItemRanges: vscode.Range[] = [];

        // 首先匹配代码块（包括带语言标识的代码块）
        const codeBlockRegex = /```[\w-]*\n([\s\S]*?)\n```/g;
        let match;
        while ((match = codeBlockRegex.exec(text))) {
            // 计算代码块内容的起始和结束位置（不包括 ``` 本身）
            const startIndex = match.index + match[0].indexOf('\n') + 1;
            const endIndex = match.index + match[0].lastIndexOf('\n');
            const startPos = editor.document.positionAt(startIndex);
            const endPos = editor.document.positionAt(endIndex);
            
            // 保存整个代码块范围用于isInCodeBlock函数
            codeBlockContentRanges.push(new vscode.Range(startPos, endPos));
            
            // 提取代码块的内容以搜索标题样式行
            const codeBlockContent = match[1];
            const codeLines = codeBlockContent.split('\n');
            let lineOffset = 0;
            
            // 处理代码块中的每一行
            for (let i = 0; i < codeLines.length; i++) {
                const line = codeLines[i];
                const lineStartIndex = startIndex + lineOffset;
                const lineEndIndex = lineStartIndex + line.length;
                const lineStartPos = editor.document.positionAt(lineStartIndex);
                const lineEndPos = editor.document.positionAt(lineEndIndex);
                
                // 判断是否是标题行（以'#'开头）
                if (line.trimStart().startsWith('#')) {
                    codeBlockHeadingRanges.push(new vscode.Range(lineStartPos, lineEndPos));
                } else {
                    // 非标题行添加到另一个数组
                    codeBlockNonHeadingRanges.push(new vscode.Range(lineStartPos, lineEndPos));
                }
                
                lineOffset += line.length + 1; // +1 为换行符
            }
        }

        // 检查位置是否在任何代码块内的辅助函数
        function isInCodeBlock(position: vscode.Position): boolean {
            for (const codeRange of codeBlockContentRanges) {
                if (codeRange.contains(position)) {
                    return true;
                }
            }
            return false;
        }

        // 匹配 Markdown 标题的正则表达式（支持 1-4 级标题）
        // 修改正则表达式以支持只有标识符而没有内容的标题
        const headingRegex = /^(#{1,4})(\s.*)?$/gm;
        while ((match = headingRegex.exec(text))) {
            const matchPos = editor.document.positionAt(match.index);
            // 只有不在代码块内的标题才添加到标题范围中
            if (!isInCodeBlock(matchPos)) {
                const headingLevel = match[1].length.toString();
                const startPos = editor.document.positionAt(match.index);
                // 计算结束位置时，排除换行符
                let matchLength = match[0].length;
                if (match[0].endsWith('\n')) {
                    matchLength -= 1;
                }
                const endPos = editor.document.positionAt(match.index + matchLength);
                if (headingLevel in headingRanges) {
                    headingRanges[headingLevel].push(new vscode.Range(startPos, endPos));
                }
            }
        }

        // 匹配粗体文本 **text** 或 __text__
        const boldRegex = /(\*\*|__)(.*?)\1/g;
        while ((match = boldRegex.exec(text))) {
            // 只高亮文本内容，不包括标记符
            const startIndex = match.index + match[1].length;
            const endIndex = startIndex + match[2].length;
            const startPos = editor.document.positionAt(startIndex);
            const endPos = editor.document.positionAt(endIndex);
            boldTextRanges.push(new vscode.Range(startPos, endPos));
        }

        // 匹配链接 [text](url)
        const linkRegex = /\[([^\[\]]+)\]\(([^()]+)\)/g;
        while ((match = linkRegex.exec(text))) {
            // 只高亮链接文本，不包括url
            const startIndex = match.index + 1;
            const endIndex = startIndex + match[1].length;
            const startPos = editor.document.positionAt(startIndex);
            const endPos = editor.document.positionAt(endIndex);
            linkRanges.push(new vscode.Range(startPos, endPos));
        }

        // 匹配引用块
        const blockquoteRegex = /^>\s.*$/gm;
        while ((match = blockquoteRegex.exec(text))) {
            const matchPos = editor.document.positionAt(match.index);
            if (!isInCodeBlock(matchPos)) {
                const startPos = editor.document.positionAt(match.index);
                const endPos = editor.document.positionAt(match.index + match[0].length);
                blockquoteRanges.push(new vscode.Range(startPos, endPos));
            }
        }

        // 匹配以"-"开头的列表项
        const dashListItemRegex = /^(\s{0,3})-\s+[^\s].*$/gm;
        while ((match = dashListItemRegex.exec(text))) {
            const matchPos = editor.document.positionAt(match.index);
            if (!isInCodeBlock(matchPos)) {
                const startPos = editor.document.positionAt(match.index);
                const endPos = editor.document.positionAt(match.index + match[0].length);
                dashListItemRanges.push(new vscode.Range(startPos, endPos));
            }
        }

        // 匹配其他列表项（有序和无序，但不包括以"-"开头的）
        const otherListItemRegex = /^(\s{0,3})(?:[*+]|\d+\.)\s+[^\s].*$/gm;
        while ((match = otherListItemRegex.exec(text))) {
            const matchPos = editor.document.positionAt(match.index);
            if (!isInCodeBlock(matchPos)) {
                const startPos = editor.document.positionAt(match.index);
                const endPos = editor.document.positionAt(match.index + match[0].length);
                listItemRanges.push(new vscode.Range(startPos, endPos));
            }
        }

        // 应用装饰，注意顺序很重要（后面的可以覆盖前面的）
        
        // 1. 应用标题装饰
        for (let level = 1; level <= 4; level++) {
            const levelStr = level.toString();
            editor.setDecorations(headingDecorations[levelStr], headingRanges[levelStr]);
        }
        
        // 2. 应用代码块非标题行装饰
        editor.setDecorations(codeBlockDecoration, codeBlockNonHeadingRanges);
        
        // 3. 最后应用代码块标题行装饰，确保它能覆盖其他装饰
        editor.setDecorations(codeBlockHeadingDecoration, codeBlockHeadingRanges);
        
        // 4. 应用其他格式装饰
        editor.setDecorations(boldTextDecoration, boldTextRanges);
        editor.setDecorations(linkDecoration, linkRanges);
        editor.setDecorations(blockquoteDecoration, blockquoteRanges);
        editor.setDecorations(listItemDecoration, listItemRanges);
        editor.setDecorations(dashListItemDecoration, dashListItemRanges);
    }

    // 初始化时检查当前编辑器
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor.document.languageId === 'markdown') {
        updateDecorations(activeEditor);
    }
}

export function deactivate() {}