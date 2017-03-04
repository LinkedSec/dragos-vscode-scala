'use strict';

import * as path from 'path';
import * as VSCode from 'vscode';

import { workspace, Disposable, ExtensionContext, commands, window, Terminal } from 'vscode';
import { LanguageClient, LanguageClientOptions, SettingMonitor, ServerOptions, TransportKind } from 'vscode-languageclient';

export function activate(context: ExtensionContext) {

  let toolsJar = process.env.JAVA_HOME + "/lib/tools.jar"
  console.info("Adding to classpath " + toolsJar);

  // The server is implemented in Scala
  let coursierPath = path.join(context.extensionPath, "./coursier")
  console.info("Using coursier " + coursierPath);

  console.log("Workspace location is: " + workspace.rootPath)

  let coursierArgs = ["launch", "-r", "https://dl.bintray.com/dhpcs/maven", "-r", "sonatype:snapshots", "-J", toolsJar, "com.github.dragos:ensime-lsp_2.11:0.1.1-SNAPSHOT", "-M", "org.github.dragos.vscode.Main"];
  let javaArgs = ["-Dvscode.workspace=" + workspace.rootPath, "-jar", coursierPath].concat(coursierArgs);
  // The debug options for the server
  let debugOptions = ["-Xdebug", "-Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=8000,quiet=y"];

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  let serverOptions: ServerOptions = {
    run: { command: "java", args: javaArgs },
    debug: { command: "java", args: debugOptions.concat(javaArgs) }
  }

  // Options to control the language client
  let clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    documentSelector: ['scala'],
    synchronize: {
    	// // Synchronize the setting section 'languageServerExample' to the server
    	// configurationSection: 'languageServerExample',
    	// Notify the server about file changes to '.clientrc files contain in the workspace
    	fileEvents: workspace.createFileSystemWatcher(workspace.rootPath + '/.ensime')
    }
  }

  // Create the language client and start the client.
  let disposable = new LanguageClient('Scala Server', serverOptions, clientOptions, false).start();

  // Push the disposable to the context's subscriptions so that the
  // client can be deactivated on extension deactivation
  context.subscriptions.push(disposable);

  // Taken from the Java plugin, this configuration can't be (yet) defined in the
  //  `scala.configuration.json` file
  VSCode.languages.setLanguageConfiguration('scala', {
    onEnterRules: [
      {
        // e.g. /** | */
        beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
        afterText: /^\s*\*\/$/,
        action: { indentAction: VSCode.IndentAction.IndentOutdent, appendText: ' * ' }
      },
      {
        // e.g. /** ...|
        beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
        action: { indentAction: VSCode.IndentAction.None, appendText: ' * ' }
      },
      {
        // e.g.  * ...|
        beforeText: /^(\t|(\ \ ))*\ \*(\ ([^\*]|\*(?!\/))*)?$/,
        action: { indentAction: VSCode.IndentAction.None, appendText: '* ' }
      },
      {
        // e.g.  */|
        beforeText: /^(\t|(\ \ ))*\ \*\/\s*$/,
        action: { indentAction: VSCode.IndentAction.None, removeText: 1 }
      }
    ]
  })

  // sbt command support
  let terminal: Terminal = null;
  const runCommandInIntegratedTerminal = (args: string[], cwd: string) => {
    if (terminal === null) {
      terminal = window.createTerminal('sbt');
      // start sbt
      terminal.sendText("sbt", true)
    }
    terminal.show();
    terminal.sendText(args.join(' '));
  }

  const runSbtCommand = (args: string[], cwd?: string) => {
    workspace.saveAll().then(() => {
      if (!cwd) {
        cwd = workspace.rootPath;
      }
      if (typeof window.createTerminal === 'function') {
        runCommandInIntegratedTerminal(args, cwd);
      }
    });
  }

  const runSbtUpdate = () => {
    runSbtCommand(['update']);
  }

  const runSbtCompile = () => {
    runSbtCommand(['compile']);
  }

  const runSbtRun = () => {
    runSbtCommand(['run']);
  }

  const runSbtTest = () => {
    runSbtCommand(['test']);
  }

  const runSbtClean = () => {
    runSbtCommand(['clean']);
  }

  const runSbtReload = () => {
    runSbtCommand(['reload']);
  }

  const runSbtPackage = () => {
    runSbtCommand(['package']);
  }

  const registerCommands = (context: ExtensionContext) => {
    context.subscriptions.push(
      commands.registerCommand('sbt.update', runSbtUpdate),
      commands.registerCommand('sbt.compile', runSbtCompile),
      commands.registerCommand('sbt.run', runSbtRun),
      commands.registerCommand('sbt.test', runSbtTest),
      commands.registerCommand('sbt.clean', runSbtClean),
      commands.registerCommand('sbt.reload', runSbtReload),
      commands.registerCommand('sbt.package', runSbtPackage)
    );
  }

  registerCommands(context);

}
