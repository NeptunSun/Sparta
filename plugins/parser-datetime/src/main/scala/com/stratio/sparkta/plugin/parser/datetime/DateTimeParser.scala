/**
 * Copyright (C) 2014 Stratio (http://stratio.com)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.stratio.sparkta.plugin.parser.datetime

import java.io.{Serializable => JSerializable}
import java.util.Date

import com.stratio.sparkta.sdk.ValidatingPropertyMap._
import com.stratio.sparkta.sdk.{Event, Parser}
import org.joda.time.format.{DateTimeFormatter, ISODateTimeFormat}

class DateTimeParser(name: String,
                      order: Integer,
                      inputField: String,
                      outputFields: Seq[String],
                      properties: Map[String, JSerializable])
  extends Parser(name, order, inputField, outputFields, properties) {

  private final val InputFormatterLabel = "inputFormat"

  private val formatter = {
    val formats = properties.toSeq.map(x =>(x._1, x._2.toString)).toMap
    val formatMethods = classOf[ISODateTimeFormat].getMethods.toSeq.map(x => (x.getName, x)).toMap
    formats.get(InputFormatterLabel) match {
      case Some(format) => {
        format match {
          case "unix" => Some(Right("unix"))
          case "unixMillis" => Some(Right("unixMillis"))
          case "autoGenerated" => Some(Right("autoGenerated"))
          case _ => Some(Left(formatMethods(format).invoke(None).asInstanceOf[DateTimeFormatter]))
        }
      }
      case None => None
    }
  }

  override def parse(data: Event): Event = {
    new Event(data.keyMap.map({
      case (key, value) =>
        if (inputField == key && formatter.isDefined && !value.isInstanceOf[Date] && outputFields.contains(key)) {
          formatter.get match {
            case Right("unix") =>
              (key, new Date(value.toString.toLong * 1000L))
            case Right("unixMillis") =>
              (key, new Date(value.toString.toLong))
            case Right("autoGenerated") =>
              (key, new Date())
            case Left(formatter) =>
              (key, formatter.parseDateTime(value.toString).toDate)
          }
        } else {
          (key, value)
        }
    }))
  }

}

