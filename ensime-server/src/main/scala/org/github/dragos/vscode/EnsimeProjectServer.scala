package org.github.dragos.vscode

import scala.collection.mutable.ListBuffer
import scala.concurrent.duration._

import org.ensime.api._
import org.ensime.api.EnsimeConfig
import org.ensime.core.Broadcaster
import org.ensime.core.Project

import com.typesafe.scalalogging.LazyLogging

import akka.actor.Actor
import akka.util.Timeout

class EnsimeProjectServer(implicit val config: EnsimeConfig) extends Actor with LazyLogging {
  implicit val timeout: Timeout = Timeout(10 seconds)

  val broadcaster = context.actorOf(Broadcaster(), "broadcaster")
  val project = context.actorOf(Project(broadcaster), "project")

  override def preStart() {
    broadcaster ! Broadcaster.Register
  }

  val compilerDiagnostics: ListBuffer[Note] = ListBuffer.empty

  override def receive = {
    case ClearAllScalaNotesEvent =>
      compilerDiagnostics.clear()

    case NewScalaNotesEvent(isFull, notes) =>
      compilerDiagnostics ++= notes
      publishDiagnostics()

    case AnalyzerReadyEvent =>
      logger.info("Analyzer is ready!")

    case FullTypeCheckCompleteEvent =>
      logger.info("Full typecheck complete event")

    case message =>
      project forward message
  }

  private def publishDiagnostics(): Unit = {
    logger.debug(s"Scala notes: ${compilerDiagnostics}")
  }
}
