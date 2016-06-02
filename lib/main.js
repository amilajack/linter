'use babel'

/* @flow */

import { CompositeDisposable } from 'atom'
import type { TextEditor } from 'atom'
import type { Linter$UI, Linter$State, Linter$Regular } from './types'
import UIRegistry from './ui-registry'
import IndieRegistry from './indie-registry'
import LinterRegistry from './linter-registry'
import MessageRegistry from './message-registry'
import EditorsRegistry from './editor-registry'

class Linter {
  state: Linter$State;
  registryUI: UIRegistry;
  registryIndie: IndieRegistry;
  registryEditors: EditorsRegistry;
  registryLinters: LinterRegistry;
  registryMessages: MessageRegistry;

  subscriptions: CompositeDisposable;

  constructor(state: Linter$State) {
    this.state = state
    this.registryUI = new UIRegistry()
    this.registryIndie = new IndieRegistry()
    this.registryEditors = new EditorsRegistry()
    this.registryLinters = new LinterRegistry()
    this.registryMessages = new MessageRegistry()

    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(this.registryUI)
    this.subscriptions.add(this.registryIndie)
    this.subscriptions.add(this.registryMessages)
    this.subscriptions.add(this.registryEditors)
    this.subscriptions.add(this.registryLinters)

    this.registryIndie.observe(indieLinter => {
      indieLinter.onDidDestroy(() => {
        this.registryMessages.deleteByLinter(indieLinter)
      })
    })
    this.registryEditors.observe(editorLinter => {
      editorLinter.onShouldLint(onChange => {
        this.registryLinters.lint({ onChange, editor: editorLinter })
      })
      editorLinter.onDidDestroy(() => {
        this.registryMessages.deleteByBuffer(editorLinter.getEditor().getBuffer())
      })
    })
    this.registryIndie.onDidUpdateMessages(({ linter, messages }) => {
      this.registryMessages.set({ linter, messages, buffer: null })
    })
    this.registryLinters.onDidUpdateMessages(({ linter, messages, buffer }) => {
      this.registryMessages.set({ linter, messages, buffer })
    })
    this.registryLinters.onDidBeginLinting(({ linter, filePath }) => {
      this.registryUI.didBeginLinting(linter, filePath)
    })
    this.registryLinters.onDidFinishLinting(({ linter, filePath }) => {
      this.registryUI.didFinishLinting(linter, filePath)
    })
    this.registryMessages.onDidUpdateMessages(difference => {
      this.registryUI.didCalculateMessages(difference)
    })

    this.registryEditors.activate()
  }
  dispose() {
    this.subscriptions.dispose()
  }

  // API methods for providing/consuming services
  addUI(ui: Linter$UI) {
    this.registryUI.add(ui)
  }
  deleteUI(ui: Linter$UI) {
    this.registryUI.delete(ui)
  }
  addLinter(linter: Linter$Regular) {
    this.registryLinters.addLinter(linter)
  }
  deleteLinter(linter: Linter$Regular) {
    this.registryLinters.deleteLinter(linter)
    this.registryMessages.deleteByLinter(linter)
  }
}

module.exports = Linter